import { copyToClipboard } from '@lobehub/ui';
import { message } from 'antd';
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

import { toggleBooleanList } from '../chat/utils';

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
  messageSubscriptions: Record<
    string,
    {
      subscribers: Set<string>;
      lastUpdate: number;
    }
  >; // Track message subscriptions (legacy - now handled by WebSocket)
  activeChatStates: Record<
    string,
    {
      isActive: boolean;
      isLoading: boolean;
      lastViewedAt: number;
      hasMoreMessages: boolean;
      lastMessageId?: string;
      pageSize: number;
      currentPage: number;
      presence?: Record<string, any>;
      typingUsers?: Record<string, number | undefined>;
      readReceipts?: Record<string, any>;
    }
  >; // Track chat activity and pagination states
  messageCache: Record<
    string,
    {
      messages: TeamChatMessageItem[];
      timestamp: string;
      expiresAt: string;
    }
  >; // Cache messages with expiration

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
  loadActiveChat: (id: string) => Promise<void>;
  switchToTeamChatTopic: (teamChatId: string, topicId: string) => void;

  // Redis/WebSocket Integration
  updateMessages: (teamChatId: string, messages: any[]) => void;
  updatePresence: (teamChatId: string, presence: Record<string, any>) => void;
  updateTypingStatus: (teamChatId: string, userId: string, isTyping: boolean) => void;
  updateReadReceipts: (teamChatId: string, receipts: Record<string, any>) => void;
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
  refreshTeamChats: () => Promise<void>;
  refreshSidebar: () => Promise<void>;
  setCurrentOrganizationId: (organizationId: string | null) => void;

  // Workspace actions
  toggleWorkspace: () => void;
  setWorkspaceWidth: (width: number) => void;
  setWorkspaceVisible: (visible: boolean) => void;

  // Message subscription actions (legacy - now handled by WebSocket)
  subscribeToChat: (chatId: string, userId: string) => void;
  unsubscribeFromChat: (chatId: string, userId: string) => void;
  messageEditingIds: string[];
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

type TeamChatStore = TeamChatState & {
  subscribeToChat: (chatId: string, userId: string) => void;
  unsubscribeFromChat: (chatId: string, userId: string) => void;
  startMessagePolling: (chatId: string) => void;
  stopMessagePolling: (chatId: string) => void;
  getMessageById: (id: string) => void;
  deleteMessage: (teamChatId: string, messageId: string) => void;
  copyMessage: (content: string) => void;
  toggleMessageEditing: (id: string, editing: boolean) => void;
  updateMessage: (teamChatId: string, messageId: string, content: string, metadata?: any) => void;
};

export const useTeamChatStore = create<TeamChatStore>()(
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
      activeChatStates: {},
      messageCache: {},
      messageSubscriptions: {},
      messageEditingIds: [],

      // Message subscription management (legacy - now handled by WebSocket)
      subscribeToChat: (chatId: string, userId: string) => {
        console.log('⚠️ subscribeToChat is deprecated - use WebSocket instead');
      },

      unsubscribeFromChat: (chatId: string, userId: string) => {
        console.log('⚠️ unsubscribeFromChat is deprecated - use WebSocket instead');
      },

      // Legacy polling methods - now handled by WebSocket
      startMessagePolling: async (chatId: string) => {
        console.log('⚠️ startMessagePolling is deprecated - use WebSocket instead');
      },

      stopMessagePolling: (chatId: string) => {
        console.log('⚠️ stopMessagePolling is deprecated - use WebSocket instead');
      },

      // Redis/WebSocket Integration
      updateMessages: (teamChatId: string, messages: any[]) => {
        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const newMessages = messages.filter(
            (msg) => !existingMessages.some((existing) => existing.id === msg.id),
          );

          if (newMessages.length === 0) return state;

          return {
            messages: {
              ...state.messages,
              [teamChatId]: [...existingMessages, ...newMessages],
            },
          };
        });
      },

      updatePresence: (teamChatId: string, presence: Record<string, any>) => {
        set((state) => ({
          activeChatStates: {
            ...state.activeChatStates,
            [teamChatId]: {
              ...state.activeChatStates[teamChatId],
              presence: {
                ...state.activeChatStates[teamChatId]?.presence,
                ...presence,
              },
            },
          },
        }));
      },

      updateTypingStatus: (teamChatId: string, userId: string, isTyping: boolean) => {
        set((state) => ({
          activeChatStates: {
            ...state.activeChatStates,
            [teamChatId]: {
              ...state.activeChatStates[teamChatId],
              typingUsers: {
                ...state.activeChatStates[teamChatId]?.typingUsers,
                [userId]: isTyping ? Date.now() : undefined,
              },
            },
          },
        }));
      },

      updateReadReceipts: (teamChatId: string, receipts: Record<string, any>) => {
        set((state) => ({
          activeChatStates: {
            ...state.activeChatStates,
            [teamChatId]: {
              ...state.activeChatStates[teamChatId],
              readReceipts: {
                ...state.activeChatStates[teamChatId]?.readReceipts,
                ...receipts,
              },
            },
          },
        }));
      },

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

          // Get current user ID
          const userState = useUserStore.getState();
          const userId = userState.user?.id;

          if (!userId) {
            throw new Error('User must be logged in to create a team chat');
          }

          console.log('🚀 Creating team chat for organization:', organizationId);

          let newChatId: string;

          if (isServerMode) {
            console.log('🚄 Using tRPC client for server mode');
            newChatId = await lambdaClient.teamChat.createTeamChat.mutate({
              organizationId,
              title,
              metadata: {
                ...(metadata || {}),
                memberAccess: [
                  {
                    userId,
                    role: 'owner',
                    addedAt: new Date().toISOString(),
                    addedBy: userId,
                  },
                ],
              },
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
              metadata: {
                ...(metadata || {}),
                memberAccess: [
                  {
                    userId,
                    role: 'owner',
                    addedAt: new Date().toISOString(),
                    addedBy: userId,
                  },
                ],
                isPublic: false,
              },
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

      // Load all team chats for an organization that the user has access to
      loadTeamChats: async (organizationId: string) => {
        try {
          if (!organizationId) {
            console.error('❌ No organization ID provided');
            return;
          }

          // Get current user ID
          const userState = useUserStore.getState();
          const userId = userState.user?.id;

          console.log('🔍 loadTeamChats debug:', {
            organizationId,
            userId,
            userState: userState.user,
            isSignedIn: userState.isSignedIn,
            isLoaded: userState.isLoaded,
          });

          if (!userId) {
            console.warn('⚠️ No user ID available, setting empty chats');
            // Instead of returning, set empty chats and clear loading state
            set({
              teamChatsByOrg: { ...get().teamChatsByOrg, [organizationId]: [] },
              isLoading: false,
              error: null,
            });
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

          // Sort chats by last activity
          chats.sort((a, b) => {
            const aTime = a.updatedAt?.getTime() || 0;
            const bTime = b.updatedAt?.getTime() || 0;
            return bTime - aTime;
          });

          console.log(`✅ Loaded ${chats.length} accessible team chats for user ${userId}`);

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

      // Set active team chat with improved loading
      setActiveTeamChat: async (id: string | null, topicId?: string) => {
        console.log('🎯 Setting active team chat:', id, topicId);

        // If id is null, clear both activeTeamChatId and activeTopicId
        if (id === null) {
          set({
            activeTeamChatId: null,
            activeTopicId: null,
            error: null,
          });
          return;
        }

        // Get current state
        const state = get();
        const currentOrgChats = state.teamChatsByOrg[state.currentOrganizationId || ''] || [];

        // First check if we have the chat in local state
        const existingChat = currentOrgChats.find((c) => c.id === id);

        // Set loading state
        set({ isLoadingMessages: true });

        try {
          // If chat exists in local state, load its messages
          if (existingChat) {
            console.log('🎯 Chat found in local state, loading messages');
            set({
              activeTeamChatId: id,
              activeTopicId: topicId || null,
              error: null,
            });
            await get().loadMessages(id);
            return;
          }

          // If we don't have the chat in local state, try to fetch it
          if (isServerMode) {
            const chat = await lambdaClient.teamChat.getTeamChatById.query({ id });

            if (!chat) {
              throw new Error('Chat not found');
            }

            // Update chat list and set as active
            set((state) => ({
              activeTeamChatId: id,
              activeTopicId: topicId || null,
              error: null,
              teamChatsByOrg: {
                ...state.teamChatsByOrg,
                [chat.organizationId]: [...currentOrgChats, chat],
              },
            }));

            // Load messages for the new chat
            await get().loadMessages(id);
            console.log('🎯 Chat fetched and messages loaded');
          } else {
            // In non-server mode, set active and load messages
            set({
              activeTeamChatId: id,
              activeTopicId: topicId || null,
              error: null,
            });
            await get().loadMessages(id);
          }
        } catch (error) {
          console.error('❌ Error setting active chat:', error);
          set({
            activeTeamChatId: null,
            activeTopicId: null,
            error: error instanceof Error ? error.message : 'Failed to access chat',
          });
        } finally {
          set({ isLoadingMessages: false });
        }
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

      // Load messages for a team chat with optimized loading and presence tracking
      loadMessages: async (teamChatId: string) => {
        try {
          set({ isLoadingMessages: true, error: null });
          console.log('📥 Loading messages for team chat:', teamChatId);

          // First check if we have messages in cache
          const state = get();
          const cachedMessages = state.messages[teamChatId];

          // If we have cached messages, show them immediately while loading new ones
          if (cachedMessages?.length) {
            console.log('📝 Using cached messages while loading new ones');
            set((state) => ({
              messages: {
                ...state.messages,
                [teamChatId]: cachedMessages,
              },
            }));
          }

          // Load new messages
          let messages: TeamChatMessageItem[] = [];
          if (isServerMode) {
            console.log('🚄 Using tRPC client to load messages');
            messages = await lambdaClient.teamChat.getMessages.query({ teamChatId });
          } else {
            const service = await getTeamChatService();
            messages = await service.getMessages(teamChatId);
          }

          // Update messages
          set((state) => ({
            messages: {
              ...state.messages,
              [teamChatId]: messages,
            },
            isLoadingMessages: false,
          }));

          // Update presence after loading messages
          if (messages.length > 0) {
            try {
              await lambdaClient.teamChat.updatePresence.mutate({
                teamChatId,
                lastSeenMessageId: messages[messages.length - 1].id,
              });
            } catch (presenceError) {
              console.error('Failed to update presence:', presenceError);
            }
          }

          console.log('✅ Loaded messages:', messages.length);
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
      ): Promise<any> => {
        try {
          let messageMetadata = metadata || {};

          // Estimate tokens if assistant message and no metadata provided
          if (messageType === 'assistant' && !metadata?.totalTokens && !metadata?.tokens) {
            messageMetadata = {
              tokens: content ? content.length / 4 : 0,
            };
          }

          // Persist to database
          let message;
          if (isServerMode) {
            console.log('🚄 Using tRPC client to send message');
            message = await lambdaClient.teamChat.addMessage.mutate({
              teamChatId,
              content,
              messageType,
              metadata: messageMetadata,
            });
          } else {
            const service = await getTeamChatService();
            message = await service.addMessageToChat(teamChatId, {
              content,
              messageType,
              id: messageId,
              metadata: messageMetadata,
            });
          }

          // Ensure message is stored in state after persistence
          if (message) {
            set((state: any) => {
              const existingMessages = state.messages[teamChatId] || [];
          
              const newMessage = {
                id: message.id,
                content: message.content,
                messageType: message.messageType,
                teamChatId,
                metadata: {
                  ...(message.metadata || {}),
                  isPersisted: true,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
          
              return {
                messages: {
                  ...state.messages,
                  [teamChatId]: [...existingMessages, newMessage],
                },
              };
            });
          }

          console.log('✅ Message sent and stored');

          // Retry logic for assistant messages
          if (retry && messageType === 'assistant') {
            console.log('🔄 Retrying AI message with updated API key...');
            const state = get();
            const existingMessages = state.messages[teamChatId] || [];
            const originalMessage = existingMessages.find((m) => m.id === messageId);
            if (originalMessage && originalMessage.messageType === 'assistant') {
              // Trigger AI message regeneration logic here
            }
          }

          return message;
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

      // Refresh team chats for current organization
      refreshTeamChats: async () => {
        const { currentOrganizationId } = get();
        if (currentOrganizationId) {
          await get().loadTeamChats(currentOrganizationId);
        } else {
          console.warn('⚠️ No current organization ID set, cannot refresh team chats');
        }
      },

      // Set current organization ID (for synchronization with organization store)
      setCurrentOrganizationId: (organizationId: string | null) => {
        set({ currentOrganizationId: organizationId });
      },

      // Refresh sidebar only - updates chat list without affecting active chat
      refreshSidebar: async () => {
        const { currentOrganizationId, activeTeamChatId, teamChatsByOrg } = get();
        if (!currentOrganizationId) return;

        try {
          console.log('🔄 Refreshing sidebar for organization:', currentOrganizationId);

          let chats: TeamChatItem[];
          if (isServerMode) {
            try {
              chats = await lambdaClient.teamChat.getTeamChatsByOrganization.query({
                organizationId: currentOrganizationId,
              });
            } catch (error) {
              // If server is down, use local state
              if (error instanceof Error && error.message.includes('Failed to fetch')) {
                console.warn('⚠️ Server connection error, using local state for sidebar');
                chats = teamChatsByOrg[currentOrganizationId] || [];
              } else {
                throw error;
              }
            }
          } else {
            const service = await getTeamChatService();
            chats = await service.getChatsByOrganization(currentOrganizationId);
          }

          // Sort chats by last activity
          chats.sort((a, b) => {
            const aTime = a.updatedAt?.getTime() || 0;
            const bTime = b.updatedAt?.getTime() || 0;
            return bTime - aTime;
          });

          // Update only the chat list, preserve active chat
          set((state) => ({
            teamChatsByOrg: {
              ...state.teamChatsByOrg,
              [currentOrganizationId]: chats,
            },
          }));

          // Check if active chat still exists in the updated list
          const activeChatStillExists = chats.some((chat) => chat.id === activeTeamChatId);
          if (activeTeamChatId && !activeChatStillExists) {
            console.log('⚠️ Active chat no longer accessible, clearing it');
            set({
              activeTeamChatId: null,
              activeTopicId: null,
              error: 'You no longer have access to this chat',
            });
          }

          console.log(`✅ Sidebar refreshed: ${chats.length} chats loaded`);
        } catch (error) {
          console.error('❌ Failed to refresh sidebar:', error);
          // For server connection errors, keep using local state
          if (error instanceof Error && error.message.includes('Failed to fetch')) {
            set({ error: 'Server connection error. Using local data.' });
          }
        }
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

      getMessageById: (id: string) => {
        const { messages } = get();
        return Object.values(messages)
          .flat()
          .find((message) => message.id === id);
      },
      deleteMessage: async (teamChatId, messageId) => {
        set((state) => {
          const chatMessages = state.messages[teamChatId];
          if (!chatMessages) return state;
          return {
            messages: {
              ...state.messages,
              [teamChatId]: chatMessages.filter((msg) => msg.id !== messageId),
            },
          };
        });
        await lambdaClient.teamChat.deleteMessage.mutate({
          teamChatId,
          messageId,
        });
      },
      copyMessage: async (content) => {
        await copyToClipboard(content);
      },
      updateMessage: async (
        teamChatId: string,
        messageId: string,
        content: string,
        metadata?: any,
      ) => {
        try {
          // Update the UI immediately for better UX
          set((state) => {
            const existingMessages = state.messages[teamChatId] || [];
            const messageIndex = existingMessages.findIndex((m) => m.id === messageId);

            if (messageIndex >= 0) {
              const updatedMessages = [...existingMessages];
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content,
                metadata: {
                  ...(updatedMessages[messageIndex].metadata || {}),
                  ...(metadata || {}),
                },
                updatedAt: new Date(),
              };

              return {
                messages: {
                  ...state.messages,
                  [teamChatId]: updatedMessages,
                },
              };
            }

            return state;
          });

          // Get current message data for metadata preservation
          const currentState = get();
          const currentMessages = currentState.messages[teamChatId] || [];
          const currentMessage = currentMessages.find((m) => m.id === messageId);

          // Persist to database
          if (isServerMode) {
            await lambdaClient.teamChat.updateMessage.mutate({
              teamChatId,
              messageId,
              content,
              metadata: {
                // Preserve existing metadata and add new metadata
                ...(currentMessage?.metadata || {}),
                ...(metadata || {}),
                // Add edit tracking
                editedAt: new Date().toISOString(),
                editedBy: useUserStore.getState().user?.id,
              },
            });
          } else {
            const service = await getTeamChatService();
            await service.updateMessage(teamChatId, messageId, {
              content,
              metadata: {
                // Preserve existing metadata and add new metadata
                ...(currentMessage?.metadata || {}),
                ...(metadata || {}),
                // Add edit tracking
                editedAt: new Date().toISOString(),
                editedBy: useUserStore.getState().user?.id,
              },
            });
          }

          console.log('✅ Message updated:', messageId);
        } catch (error) {
          console.error('❌ Failed to update message:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to update message',
          });
        }
      },
      toggleMessageEditing: (id: string, editing: boolean) => {
        set(
          (state) => {
            const currentEditingIds = state.messageEditingIds || [];

            if (editing) {
              // Add to editing list if not already there
              return {
                messageEditingIds: currentEditingIds.includes(id)
                  ? currentEditingIds
                  : [...currentEditingIds, id],
              };
            } else {
              // Remove from editing list
              return {
                messageEditingIds: currentEditingIds.filter((editingId) => editingId !== id),
              };
            }
          },
          false,
          'toggleMessageEditing',
        );
      },
    }),

    {
      name: 'team-chat-store',
    },
  ),
);
