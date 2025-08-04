import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { isServerMode } from '@/const/version';
import { TeamChatItem, TeamChatMessageItem } from '@/database/schemas/teamChat';
import { convertUsage } from '@/libs/model-runtime/utils/usageConverter';
import { lambdaClient } from '@/libs/trpc/client';
import { chatService } from '@/services/chat';
import { TeamChatService } from '@/services/teamChatService';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useUserStore } from '@/store/user';
import { CreateMessageParams } from '@/types/message';

interface TeamChatMetadata {
  organizationId: string;
  [key: string]: any;
}

interface TeamChatState {
  // State
  teamChatsByOrg: Record<string, TeamChatItem[]>; // organizationId -> chats
  activeTeamChatId: string | null;
  activeTopicId: string | null;
  messages: Record<string, TeamChatMessageItem[]>; // teamChatId -> messages
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  currentOrganizationId: string | null; // Track current organization

  // Session-like state
  isSessionsFirstFetchFinished: boolean;
  isSearching: boolean;
  searchKeywords: string;
  signalSessionMeta?: AbortController;

  // Workspace state
  workspaceEnabled: boolean;
  workspaceConfig: {
    isVisible: boolean;
    width: number;
  };

  // Actions
  createTeamChat: (
    organizationId: string,
    title?: string,
    metadata?: TeamChatMetadata,
  ) => Promise<string>;
  createNewTeamChatWithTopic: (
    organizationId: string,
    title?: string,
    metadata?: TeamChatMetadata,
  ) => Promise<{ teamChatId: string; topicId: string }>;
  loadTeamChats: (organizationId: string) => Promise<void>;
  setActiveTeamChat: (id: string | null, topicId?: string) => void;
  switchToTeamChatTopic: (teamChatId: string, topicId: string) => void;
  updateTeamChat: (
    id: string,
    data: { title?: string; description?: string; metadata?: any },
  ) => Promise<void>;
  deleteTeamChat: (id: string) => Promise<void>;
  loadMessages: (teamChatId: string) => Promise<void>;
  sendMessage: (
    teamChatId: string,
    content: string,
    messageType?: 'user' | 'assistant',
    messageId?: string,
    retry?: boolean,
    metadata?: any,
  ) => Promise<void>;
  retryMessage: (
    teamChatId: string,
    messageId: string,
    originalUserMessage: string,
  ) => Promise<void>;
  clearError: () => void;

  // Workspace actions
  toggleWorkspace: () => void;
  setWorkspaceWidth: (width: number) => void;
  setWorkspaceVisible: (visible: boolean) => void;
}

const getTeamChatService = async () => {
  const userState = useUserStore.getState();
  const userId = userState.user?.id;

  if (!userId) {
    console.error('User not logged in when trying to access team chat service');
    throw new Error('User not logged in');
  }

  // Use server database in server mode, client database in client mode
  if (isServerMode) {
    console.log('🚄 Using server database for team chats');
    // For server mode, we need to call an API endpoint instead of directly accessing the database
    throw new Error('Server mode team chats should use API endpoints, not direct database access');
  } else {
    console.log('📱 Using client PGlite database for team chats');
    // For client mode, use the existing PGlite logic
    const { useGlobalStore } = await import('@/store/global');
    const { DatabaseLoadingState } = await import('@/types/clientDB');

    const globalState = useGlobalStore.getState();

    // First check if PGlite is enabled, if not enable it automatically for team chats
    if (!globalState.status.isEnablePglite) {
      console.log('🔧 Enabling PGlite for team chats...');
      await globalState.markPgliteEnabled();
    }

    // Wait for database initialization
    let currentState = useGlobalStore.getState();
    if (
      currentState.initClientDBStage !== DatabaseLoadingState.Ready &&
      currentState.initClientDBStage !== DatabaseLoadingState.Finished
    ) {
      console.log('⏳ Waiting for database initialization...');
      await currentState.initializeClientDB();

      // Wait a bit more for the database to be fully ready
      let retries = 0;
      const maxRetries = 20;
      while (retries < maxRetries) {
        currentState = useGlobalStore.getState();
        if (currentState.initClientDBStage === DatabaseLoadingState.Ready) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        retries++;
        console.log(
          `⏳ Still waiting for database... (${retries}/${maxRetries}) - State: ${currentState.initClientDBStage}`,
        );
      }

      currentState = useGlobalStore.getState();
      if (currentState.initClientDBStage !== DatabaseLoadingState.Ready) {
        throw new Error(
          `Database initialization timeout. Current state: ${currentState.initClientDBStage}`,
        );
      }
    }

    // Import clientDB dynamically after initialization
    const { clientDB } = await import('@/database/client/db');
    return new TeamChatService(clientDB as any, userId);
  }
};

export const useTeamChatStore = create<TeamChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      teamChatsByOrg: {},
      activeTeamChatId: null,
      activeTopicId: null,
      messages: {},
      isLoading: false,
      isLoadingMessages: false,
      error: null,
      currentOrganizationId: null,

      // Session-like state
      isSessionsFirstFetchFinished: false,
      isSearching: false,
      searchKeywords: '',
      signalSessionMeta: undefined,

      // Workspace state
      workspaceEnabled: true,
      workspaceConfig: {
        isVisible: true,
        width: 320,
      },

      // Create a new team chat
      createTeamChat: async (
        organizationId: string,
        title = 'Team Chat',
        metadata?: TeamChatMetadata,
      ) => {
        try {
          set({ isLoading: true, error: null });
          if (!organizationId) {
            throw new Error('organizationId is required to create a team chat');
          }
          console.log('🚀 Creating team chat for organization:', organizationId);

          let newChatId: string;

          if (isServerMode) {
            console.log('🚄 Using tRPC client for server mode');
            newChatId = await lambdaClient.teamChat.createTeamChat.mutate({
              organizationId,
              title,
            });

            // For server mode, we need to reload the list to get the full object
            const chats = await lambdaClient.teamChat.getTeamChatsByOrganization.query({
              organizationId,
            });
            const newChat = chats.find((chat) => chat.id === newChatId);

            if (newChat) {
              set((state) => ({
                teamChatsByOrg: {
                  ...state.teamChatsByOrg,
                  [organizationId]: [...(state.teamChatsByOrg[organizationId] || []), newChat],
                },
                activeTeamChatId: newChat.id,
                currentOrganizationId: organizationId,
                isLoading: false,
              }));
            } else {
              set({ isLoading: false });
            }
          } else {
            const service = await getTeamChatService();
            const newChat = await service.createTeamChat({
              organizationId,
              title,
              description: `Team chat for organization ${organizationId}`,
              metadata: { ...(metadata || {}), organizationId },
            });

            newChatId = newChat.id;

            // Add to state
            set((state) => ({
              teamChatsByOrg: {
                ...state.teamChatsByOrg,
                [organizationId]: [...(state.teamChatsByOrg[organizationId] || []), newChat],
              },
              activeTeamChatId: newChat.id,
              currentOrganizationId: organizationId,
              isLoading: false,
            }));
          }

          console.log('✅ Team chat created:', newChatId);
          return newChatId;
        } catch (error) {
          console.error('❌ Failed to create team chat:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create team chat',
            isLoading: false,
          });
          throw error;
        }
      },

      // Create a new team chat with topic ID for URL routing
      createNewTeamChatWithTopic: async (
        organizationId: string,
        title = 'New Chat',
        metadata?: TeamChatMetadata,
      ) => {
        try {
          const teamChatId = await get().createTeamChat(organizationId, title, metadata);
          const topicId = `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Set the topic ID in state
          set({ activeTopicId: topicId });

          console.log('✅ Team chat with topic created:', { teamChatId, topicId });
          return { teamChatId, topicId };
        } catch (error) {
          console.error('❌ Failed to create team chat with topic:', error);
          throw error;
        }
      },

      // Load all team chats for an organization
      loadTeamChats: async (organizationId: string) => {
        try {
          if (!organizationId) {
            console.error('❌ No organization ID provided');
            return;
          }

          set({ isLoading: true, error: null });
          console.log('📥 Loading team chats for organization:', organizationId);

          let chats: TeamChatItem[];

          if (isServerMode) {
            console.log('🚄 Using tRPC client for server mode');
            chats = await lambdaClient.teamChat.getTeamChatsByOrganization.query({
              organizationId,
            });
          } else {
            const service = await getTeamChatService();
            chats = await service.getChatsByOrganization(organizationId);
          }

          // console.log('✅ Loaded team chats:', chats.length);

          // Update chats for this organization and set it as current
          set((state) => ({
            teamChatsByOrg: {
              ...state.teamChatsByOrg,
              [organizationId]: chats,
            },
            currentOrganizationId: organizationId,
            isLoading: false,
          }));
        } catch (error) {
          console.error('❌ Failed to load team chats:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load team chats',
            isLoading: false,
          });
        }
      },

      // Set active team chat
      setActiveTeamChat: (id: string | null, topicId?: string) => {
        console.log('🎯 Setting active team chat:', id, topicId);
        // If id is null, clear both activeTeamChatId and activeTopicId
        if (id === null) {
          set({
            activeTeamChatId: null,
            activeTopicId: null,
          });
          return;
        }
        // Otherwise set the new active chat and topic
        set({
          activeTeamChatId: id,
          activeTopicId: topicId || null,
        });
      },

      // Switch to a specific team chat topic (for URL routing)
      switchToTeamChatTopic: (teamChatId: string, topicId: string) => {
        console.log('🔄 Switching to team chat topic:', teamChatId, topicId);
        set({
          activeTeamChatId: teamChatId,
          activeTopicId: topicId,
        });
      },

      // Update a team chat
      updateTeamChat: async (
        id: string,
        data: { title?: string; description?: string; metadata?: any },
      ) => {
        try {
          set({ isLoading: true, error: null });
          console.log('✏️ Updating team chat:', id, data);

          let updatedChat;
          if (isServerMode) {
            console.log('🚄 Using tRPC client for server mode');
            updatedChat = await lambdaClient.teamChat.updateTeamChat.mutate({ id, ...data });
          } else {
            const service = await getTeamChatService();
            updatedChat = await service.updateTeamChat(id, data);
          }

          // Update in state
          set((state) => {
            const orgId = state.currentOrganizationId;
            if (!orgId) return { isLoading: false };

            const orgChats = state.teamChatsByOrg[orgId] || [];
            return {
              teamChatsByOrg: {
                ...state.teamChatsByOrg,
                [orgId]: orgChats.map((chat: TeamChatItem) =>
                  chat.id === id ? { ...chat, ...updatedChat } : chat,
                ),
              },
              isLoading: false,
            };
          });

          console.log('✅ Team chat updated:', id);
        } catch (error) {
          console.error('❌ Failed to update team chat:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to update team chat',
            isLoading: false,
          });
          throw error;
        }
      },

      // Delete a team chat
      deleteTeamChat: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          console.log('🗑️ Deleting team chat:', id);

          if (isServerMode) {
            console.log('🚄 Using tRPC client for server mode');
            await lambdaClient.teamChat.deleteTeamChat.mutate({ id });
          } else {
            const service = await getTeamChatService();
            await service.deleteTeamChat(id);
          }

          // Remove from state
          set((state) => {
            const orgId = state.currentOrganizationId;
            if (!orgId) return { isLoading: false };

            const orgChats = state.teamChatsByOrg[orgId] || [];
            return {
              teamChatsByOrg: {
                ...state.teamChatsByOrg,
                [orgId]: orgChats.filter((chat: TeamChatItem) => chat.id !== id),
              },
              activeTeamChatId: state.activeTeamChatId === id ? null : state.activeTeamChatId,
              isLoading: false,
            };
          });

          console.log('✅ Team chat deleted:', id);
        } catch (error) {
          console.error('❌ Failed to delete team chat:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to delete team chat',
            isLoading: false,
          });
          throw error;
        }
      },

      // Load messages for a team chat
      loadMessages: async (teamChatId: string) => {
        try {
          set({ isLoadingMessages: true, error: null });
          console.log('📥 Loading messages for team chat:', teamChatId);

          let messages: TeamChatMessageItem[] = [];
          if (isServerMode) {
            console.log('🚄 Using tRPC client to load messages');
            messages = await lambdaClient.teamChat.getMessages.query({ teamChatId });
          } else {
            const service = await getTeamChatService();
            messages = await service.getMessages(teamChatId);
          }

          set((state) => ({
            messages: {
              ...state.messages,
              [teamChatId]: messages,
            },
            isLoadingMessages: false,
          }));

          // console.log('✅ Loaded messages:', messages.length);
        } catch (error) {
          console.error('❌ Failed to load messages:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load messages',
            isLoadingMessages: false,
          });
        }
      },

      // Send a message in team chat
      sendMessage: async (
        teamChatId: string,
        content: string,
        messageType: 'user' | 'assistant' = 'user',
        messageId?: string,
        retry: boolean = false,
        metadata?: any,
      ) => {
        try {
          console.log('📤 Sending message to team chat:', teamChatId, messageType);

          // Use provided metadata (including proper usage tokens) or fall back to simple estimation
          let messageMetadata = metadata || {};

          // If no metadata provided for assistant messages, use simple estimation as fallback
          if (messageType === 'assistant' && !metadata?.totalTokens && !metadata?.tokens) {
            messageMetadata = {
              tokens: content ? content.length / 4 : 0, // Simple estimate as fallback
            };
          }

          // First, update the UI immediately for better UX
          set((state) => {
            const existingMessages = state.messages[teamChatId] || [];
            let updatedMessages;

            if (messageId) {
              // Update existing message if messageId is provided
              const existingIndex = existingMessages.findIndex((m) => m.id === messageId);
              if (existingIndex >= 0) {
                updatedMessages = [...existingMessages];
                updatedMessages[existingIndex] = {
                  ...updatedMessages[existingIndex],
                  content,
                  metadata: {
                    ...(updatedMessages[existingIndex].metadata || {}),
                    ...(messageMetadata || {}),
                  },
                };
              } else {
                // Add new message if not found
                const newMessage = {
                  id: messageId,
                  content,
                  messageType,
                  teamChatId,
                  metadata: messageMetadata || {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                updatedMessages = [...existingMessages, newMessage as any];
              }
            } else {
              // Add new message with generated ID
              const newMessage = {
                id: `temp-${Date.now()}`,
                content,
                messageType,
                teamChatId,
                metadata: messageMetadata || {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              updatedMessages = [...existingMessages, newMessage as any];
            }

            return {
              messages: {
                ...state.messages,
                [teamChatId]: updatedMessages,
              },
            };
          });

          // Then persist to database in background
          let message;
          if (isServerMode) {
            console.log('🚄 Using tRPC client to send message');
            message = await lambdaClient.teamChat.addMessage.mutate({
              teamChatId,
              content,
              messageType,
              metadata: messageMetadata || {},
            });
          } else {
            const service = await getTeamChatService();
            message = await service.addMessageToChat(teamChatId, {
              content,
              messageType,
              id: messageId,
              metadata: messageMetadata || {},
            });
          }

          console.log('✅ Message sent/updated');

          // Retry logic if it's a retry attempt
          if (retry && messageType === 'assistant') {
            console.log('🔄 Retrying AI message with updated API key...');
            // Code to retry AI generation
            const state = get();
            const existingMessages = state.messages[teamChatId] || [];
            const originalMessage = existingMessages.find((m) => m.id === messageId);
            if (originalMessage && originalMessage.messageType === 'assistant') {
              // Here you'd re-trigger the AI message generation, similar to the logic in TeamChatInput
            }
          }
        } catch (error) {
          console.error('❌ Failed to send message:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to send message',
          });
        }
      },

      // Retry a failed AI message
      retryMessage: async (teamChatId: string, messageId: string, originalUserMessage: string) => {
        try {
          console.log('🔄 Retrying message:', messageId);
          const sessionId = teamChatId; // Use team chat ID as session ID
          const messages: CreateMessageParams[] = [
            {
              role: 'user',
              content: originalUserMessage,
              sessionId,
            },
          ];

          const agentConfig = agentSelectors.currentAgentConfig(useAgentStore.getState());
          if (!agentConfig) throw new Error('No agent configuration found');

          // Add system role if configured
          if (agentConfig.systemRole) {
            messages.unshift({ role: 'system', content: agentConfig.systemRole, sessionId });
          }

          let aiResponse = '';
          await chatService.createAssistantMessageStream({
            params: {
              messages: messages as any,
              model: agentConfig.model,
              provider: agentConfig.provider,
              ...agentConfig.params,
              plugins: agentConfig.plugins,
            },
            onMessageHandle: (chunk) => {
              // Handle different chunk types like main chat
              switch (chunk.type) {
                case 'text': {
                  aiResponse += chunk.text;
                  // Update the assistant message in real-time for streaming effect
                  get().sendMessage(teamChatId, aiResponse, 'assistant', messageId);
                  break;
                }
                case 'tool_calls': {
                  // Handle tool calls if needed
                  console.log('Tool calls received:', chunk.tool_calls);
                  break;
                }
                case 'reasoning': {
                  // Handle reasoning if needed
                  console.log('Reasoning chunk:', chunk.text);
                  break;
                }
                default: {
                  // Handle other chunk types
                  if ('text' in chunk && chunk.text) {
                    aiResponse += chunk.text;
                    get().sendMessage(teamChatId, aiResponse, 'assistant', messageId);
                  }
                }
              }
            },
            onFinish: async (finalContent, context) => {
              const finalMessage = finalContent || aiResponse || 'No response generated';

              // Extract usage information and include model/provider for proper display
              const metadata = context?.usage
                ? {
                    ...context.usage,
                    model: agentConfig.model,
                    provider: agentConfig.provider,
                    // Use the API's token count directly
                    totalTokens: context.usage.totalTokens || 0,
                  }
                : {
                    model: agentConfig.model,
                    provider: agentConfig.provider,
                  };

              await get().sendMessage(
                teamChatId,
                finalMessage,
                'assistant',
                messageId,
                false,
                metadata,
              );
            },
            onErrorHandle: (error) => {
              console.error('AI retry error:', error);
              get().sendMessage(
                teamChatId,
                'Failed to generate AI response after retry.',
                'assistant',
                messageId,
              );
            },
          });

          console.log('✅ Retry attempt completed for message:', messageId);
        } catch (error) {
          console.error('❌ Failed to retry message:', error);
          get().sendMessage(teamChatId, 'Failed to generate AI response.', 'assistant', messageId);
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Workspace actions
      toggleWorkspace: () => {
        set((state) => ({
          workspaceConfig: {
            ...state.workspaceConfig,
            isVisible: !state.workspaceConfig.isVisible,
          },
        }));
      },

      setWorkspaceWidth: (width: number) => {
        set((state) => ({
          workspaceConfig: {
            ...state.workspaceConfig,
            width: Math.max(280, Math.min(800, width)), // Constrain width between 280px and 800px
          },
        }));
      },

      setWorkspaceVisible: (visible: boolean) => {
        set((state) => ({
          workspaceConfig: {
            ...state.workspaceConfig,
            isVisible: visible,
          },
        }));
      },
    }),
    {
      name: 'team-chat-store',
    },
  ),
);
