import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { DEFAULT_AGENT_CONFIG } from '@/const/settings';
import { isServerMode } from '@/const/version';
import { TeamChatItem, TeamChatMessageItem } from '@/database/schemas/teamChat';
import { convertUsage } from '@/libs/model-runtime/utils/usageConverter';
import { lambdaClient } from '@/libs/trpc/client';
// Removed server-side service imports - these should not be used in client-side code
import { chatService } from '@/services/chat';
import { teamChatCreditService } from '@/services/teamChatCreditService/index';
import { TeamChatService } from '@/services/teamChatService';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useUserStore } from '@/store/user';
import { CreateMessageParams } from '@/types/message';

import { toggleBooleanList } from '../chat/utils';

// Default state for active chat states
const defaultState = {
  isActive: false,
  isLoading: false,
  lastViewedAt: 0,
  hasMoreMessages: false,
  lastMessageId: undefined,
  pageSize: 50,
  currentPage: 1,
  presence: {},
  typingUsers: {},
  readReceipts: {},
};

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
  removeMessage: (teamChatId: string, messageId: string) => void;
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
  // Credit tracking service
  creditService: typeof teamChatCreditService;

  // Centralized message management - single source of truth for all message operations
  addMessage: (
    teamChatId: string,
    message: {
      id?: string;
      content: string;
      messageType: 'user' | 'assistant' | 'system';
      userId: string;
      metadata?: any;
      createdAt?: Date;
      isLocal?: boolean; // Flag to prevent WebSocket duplication
      sendTime?: Date;
    },
  ) => Promise<any>;

  // Update an existing message in the store
  updateMessage: (
    teamChatId: string,
    messageId: string,
    updates: Partial<TeamChatMessageItem> & { isLocal?: boolean },
  ) => any;

  // Batch update messages (for WebSocket reconciliation)
  batchUpdateMessages: (teamChatId: string, messages: TeamChatMessageItem[]) => void;

  // Method to persist message to database
  persistMessageToDatabase: (teamChatId: string, messageData: any) => Promise<void>;
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
  creditService: typeof teamChatCreditService;
  getMessageById: (id: string) => TeamChatMessageItem | undefined;
  removeMessage: (teamChatId: string, messageId: string) => void;
  copyMessage: (content: string) => void;
  toggleMessageEditing: (id: string, editing: boolean) => void;
  updateMessageContent: (teamChatId: string, messageId: string, content: string, metadata?: any) => void;

  // Redis-based real-time operations
  handleRedisMessageDelete: (messageId: string, teamChatId: string) => void;
  handleRedisMessageUpdate: (
    messageId: string,
    teamChatId: string,
    updates: Partial<TeamChatMessageItem>,
  ) => void;
  handleRedisMessageComplete: (
    messageId: string,
    teamChatId: string,
    finalMessage: TeamChatMessageItem,
  ) => void;
  handleRedisTypingUpdate: (teamChatId: string, userId: string, isTyping: boolean) => void;
  handleRedisMessageError: (messageId: string, teamChatId: string, error: string) => void;
  handleRedisMessageReaction: (
    messageId: string,
    teamChatId: string,
    userId: string,
    reaction: string,
  ) => void;
  handleRedisReadReceipt: (messageId: string, teamChatId: string, userId: string) => void;
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

      // Initialize credit tracking service
      creditService: teamChatCreditService,

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
        // Backward-compatible: delegate to upsert to ensure replacement and sorting
        get().batchUpdateMessages(teamChatId, messages as any);
      },

      // Update existing message content (for streaming, etc.)
      updateMessage: async (
        teamChatId: string,
        messageId: string,
        updates: Partial<TeamChatMessageItem>,
      ) => {
        // console.log(`📝 updateMessage called for ${teamChatId}:`, {
        //   messageId,
        //   updates,
        //   isLocalChange: (updates as any).isLocal !== undefined,
        //   newIsLocalValue: (updates as any).isLocal,
        // });

        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const messageIndex = existingMessages.findIndex((m) => m.id === messageId);

          if (messageIndex === -1) {
            console.log(`   ❌ Message not found: ${messageId}`);
            return state;
          }

          const existingMessage = existingMessages[messageIndex] as any;
          // console.log(`   📋 Existing message:`, {
          //   id: existingMessage.id,
          //   messageType: existingMessage.messageType,
          //   currentIsLocal: existingMessage.isLocal,
          //   newIsLocal: (updates as any).isLocal,
          // });

          // Create updated message
          const updatedMessage = {
            ...existingMessage,
            ...updates,
          } as any;

          // Use the same deduplication and sorting logic as batchUpdateMessages
          const messageMap = new Map(existingMessages.map((m) => [m.id, m]));

          // Update the specific message
          messageMap.set(messageId, updatedMessage);

          // Apply the same sorting logic for consistency
          const sortedMessages = Array.from(messageMap.values()).sort((a, b) => {
            // Parse timestamps to numbers for comparison
            const getTimestamp = (msg: TeamChatMessageItem): number => {
              if (msg.createdAt instanceof Date) {
                return msg.createdAt.getTime();
              }
              if (typeof msg.createdAt === 'string') {
                return new Date(msg.createdAt).getTime();
              }
              return 0;
            };

            const tsA = getTimestamp(a);
            const tsB = getTimestamp(b);

            // First priority: sort by timestamp
            if (tsA !== tsB) {
              return tsA - tsB;
            }

            // Second priority: when timestamps are equal, user messages come first
            if (a.userId !== b.userId) {
              // User messages (userId !== "assistant") come before assistant messages
              if (a.userId === 'assistant') return 1;
              if (b.userId === 'assistant') return -1;
            }

            // Third priority: if still equal, sort by ID for consistency
            return a.id.localeCompare(b.id);
          });

          return {
            messages: {
              ...state.messages,
              [teamChatId]: sortedMessages,
            },
          };
        });
        const state = get();
        const existingMessages = state.messages[teamChatId] || [];
        const messageIndex = existingMessages.findIndex((m) => m.id === messageId);
        return messageIndex !== -1 ? existingMessages[messageIndex] : undefined;

        // If the message is no longer local, check if it's an AI message and persist it to database
        // if ((updates as any).metadata.isLocal === false) {
        //   console.log(`   🔄 Message is no longer local, checking if it's an AI message...`);
        //   const state = get();
        //   const existingMessages = state.messages[teamChatId] || [];
        //   const message = existingMessages.find((m) => m.id === messageId);

        //   if (message && message.messageType === 'assistant') {
        //     console.log(`   💾 Persisting updated AI message to database: ${messageId}`);
        //     console.log(`   📊 Message data:`, {
        //       id: message.id,
        //       content: message.content.substring(0, 100),
        //       messageType: message.messageType,
        //       metadata: message.metadata,
        //     });
        //     // Use the persistMessageToDatabase method to save the updated message
        //     // Exclude isLocal from database persistence since it's not in the schema yet
        //     const { isLocal, ...dbMessageData } = message as any;
        //     await get().persistMessageToDatabase(teamChatId, dbMessageData);
        //     console.log(`   ✅ AI message persisted successfully: ${messageId}`);
        //   } else {
        //     console.log(`   ℹ️ Message is not an AI message or not found:`, {
        //       messageId,
        //       messageType: message?.messageType,
        //       isLocal: (message as any)?.isLocal,
        //     });
        //   }
        // } else {
        //   console.log(`   ℹ️ Message is still local or isLocal not changed:`, {
        //     messageId,
        //     newIsLocal: (updates as any).isLocal,
        //   });
        // }
      },

      updateMessageContent: async (
        teamChatId: string,
        messageId: string,
        content: string,
      ) => {
        // console.log(`📝 updateMessage called for ${teamChatId}:`, {
        //   messageId,
        //   updates,
        //   isLocalChange: (updates as any).isLocal !== undefined,
        //   newIsLocalValue: (updates as any).isLocal,
        // });

        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const messageIndex = existingMessages.findIndex((m) => m.id === messageId);

          if (messageIndex === -1) {
            console.log(`   ❌ Message not found: ${messageId}`);
            return state;
          }

          const existingMessage = existingMessages[messageIndex] as any;
          // console.log(`   📋 Existing message:`, {
          //   id: existingMessage.id,
          //   messageType: existingMessage.messageType,
          //   currentIsLocal: existingMessage.isLocal,
          //   newIsLocal: (updates as any).isLocal,
          // });

          // Create updated message
          const updatedMessage = {
            ...existingMessage,
            content,
          } as any;

          // Use the same deduplication and sorting logic as batchUpdateMessages
          const messageMap = new Map(existingMessages.map((m) => [m.id, m]));

          // Update the specific message
          messageMap.set(messageId, updatedMessage);

          // Apply the same sorting logic for consistency
          const sortedMessages = Array.from(messageMap.values()).sort((a, b) => {
            // Parse timestamps to numbers for comparison
            const getTimestamp = (msg: TeamChatMessageItem): number => {
              if (msg.createdAt instanceof Date) {
                return msg.createdAt.getTime();
              }
              if (typeof msg.createdAt === 'string') {
                return new Date(msg.createdAt).getTime();
              }
              return 0;
            };

            const tsA = getTimestamp(a);
            const tsB = getTimestamp(b);

            // First priority: sort by timestamp
            if (tsA !== tsB) {
              return tsA - tsB;
            }

            // Second priority: when timestamps are equal, user messages come first
            if (a.userId !== b.userId) {
              // User messages (userId !== "assistant") come before assistant messages
              if (a.userId === 'assistant') return 1;
              if (b.userId === 'assistant') return -1;
            }

            // Third priority: if still equal, sort by ID for consistency
            return a.id.localeCompare(b.id);
          });

          return {
            messages: {
              ...state.messages,
              [teamChatId]: sortedMessages,
            },
          };
        });

        // If the message is no longer local, check if it's an AI message and persist it to database
        // if ((updates as any).metadata.isLocal === false) {
        //   console.log(`   🔄 Message is no longer local, checking if it's an AI message...`);
        //   const state = get();
        //   const existingMessages = state.messages[teamChatId] || [];
        //   const message = existingMessages.find((m) => m.id === messageId);

        //   if (message && message.messageType === 'assistant') {
        //     console.log(`   💾 Persisting updated AI message to database: ${messageId}`);
        //     console.log(`   📊 Message data:`, {
        //       id: message.id,
        //       content: message.content.substring(0, 100),
        //       messageType: message.messageType,
        //       metadata: message.metadata,
        //     });
        //     // Use the persistMessageToDatabase method to save the updated message
        //     // Exclude isLocal from database persistence since it's not in the schema yet
        //     const { isLocal, ...dbMessageData } = message as any;
        //     await get().persistMessageToDatabase(teamChatId, dbMessageData);
        //     console.log(`   ✅ AI message persisted successfully: ${messageId}`);
        //   } else {
        //     console.log(`   ℹ️ Message is not an AI message or not found:`, {
        //       messageId,
        //       messageType: message?.messageType,
        //       isLocal: (message as any)?.isLocal,
        //     });
        //   }
        // } else {
        //   console.log(`   ℹ️ Message is still local or isLocal not changed:`, {
        //     messageId,
        //     newIsLocal: (updates as any).isLocal,
        //   });
        // }
      },

      // Remove a message by id
      removeMessage: (teamChatId: string, messageId: string) => {
        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const filteredMessages = existingMessages.filter((m: any) => m.id !== messageId);

          // Apply the same sorting logic for consistency
          const sortedMessages = filteredMessages.sort((a, b) => {
            // Parse timestamps to numbers for comparison
            const getTimestamp = (msg: TeamChatMessageItem): number => {
              if (msg.createdAt instanceof Date) {
                return msg.createdAt.getTime();
              }
              if (typeof msg.createdAt === 'string') {
                return new Date(msg.createdAt).getTime();
              }
              return 0;
            };

            const tsA = getTimestamp(a);
            const tsB = getTimestamp(b);

            // First priority: sort by timestamp
            if (tsA !== tsB) {
              return tsA - tsB;
            }

            // Second priority: when timestamps are equal, user messages come first
            if (a.userId !== b.userId) {
              // User messages (userId !== "assistant") come before assistant messages
              if (a.userId === 'assistant') return 1;
              if (b.userId === 'assistant') return -1;
            }

            // Third priority: if still equal, sort by ID for consistency
            return a.id.localeCompare(b.id);
          });

          return {
            messages: {
              ...state.messages,
              [teamChatId]: sortedMessages,
            },
          };
        });
      },

      // Get a message by id from any team chat
      getMessageById: (id: string) => {
        const state = get();
        for (const messages of Object.values(state.messages)) {
          const message = messages.find((m: any) => m.id === id);
          if (message) return message;
        }
        return undefined;
      },

      // Copy message content to clipboard
      copyMessage: (content: string) => {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(content);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = content;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
          } catch (err) {
            console.error('Failed to copy message:', err);
          }
          document.body.removeChild(textArea);
        }
      },

      // Toggle message editing state
      toggleMessageEditing: (id: string, editing: boolean) => {
        set((state) => ({
          messageEditingIds: editing
            ? [...state.messageEditingIds, id]
            : state.messageEditingIds.filter((editId) => editId !== id),
        }));
      },

      // Redis-based real-time message operations
      // These methods are called by WebSocket handlers to sync state across all users

      // Handle real-time message deletion from Redis
      handleRedisMessageDelete: (messageId: string, teamChatId: string) => {
        console.log(`🔄 Redis: Handling message deletion: ${messageId} in ${teamChatId}`);
        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const filteredMessages = existingMessages.filter((m: any) => m.id !== messageId);
          return {
            messages: {
              ...state.messages,
              [teamChatId]: filteredMessages,
            },
          };
        });
      },

      // Handle real-time message updates from Redis (for streaming)
      handleRedisMessageUpdate: (
        messageId: string,
        teamChatId: string,
        updates: Partial<TeamChatMessageItem>,
      ) => {
        console.log(`🔄 Redis: Handling message update: ${messageId} in ${teamChatId}`);
        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const messageIndex = existingMessages.findIndex((m: any) => m.id === messageId);

          if (messageIndex === -1) {
            console.log(`   ❌ Message not found for Redis update: ${messageId}`);
            return state;
          }

          const updatedMessages = [...existingMessages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            ...updates,
            updatedAt: new Date(),
          } as any;

          return {
            messages: {
              ...state.messages,
              [teamChatId]: updatedMessages,
            },
          };
        });
      },

      // Handle real-time message completion from Redis
      handleRedisMessageComplete: (
        messageId: string,
        teamChatId: string,
        finalMessage: TeamChatMessageItem,
      ) => {
        console.log(`🔄 Redis: Handling message completion: ${messageId} in ${teamChatId}`);
        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const messageIndex = existingMessages.findIndex((m: any) => m.id === messageId);

          if (messageIndex === -1) {
            console.log(`   ❌ Message not found for Redis completion: ${messageId}`);
            return state;
          }

          const updatedMessages = [...existingMessages];
          updatedMessages[messageIndex] = {
            ...finalMessage,
            updatedAt: new Date(),
          } as any;

          return {
            messages: {
              ...state.messages,
              [teamChatId]: updatedMessages,
            },
          };
        });
      },

      // Handle real-time typing indicators from Redis
      handleRedisTypingUpdate: (teamChatId: string, userId: string, isTyping: boolean) => {
        console.log(
          `🔄 Redis: Handling typing update: ${userId} ${isTyping ? 'started' : 'stopped'} typing in ${teamChatId}`,
        );
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

      // Handle real-time message errors from Redis
      handleRedisMessageError: (messageId: string, teamChatId: string, error: string) => {
        console.log(`🔄 Redis: Handling message error: ${messageId} in ${teamChatId} - ${error}`);
        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const messageIndex = existingMessages.findIndex((m: any) => m.id === messageId);

          if (messageIndex === -1) {
            console.log(`   ❌ Message not found for Redis error: ${messageId}`);
            return state;
          }

          const updatedMessages = [...existingMessages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            error: {
              type: 'redis_error',
              message: error,
            },
            updatedAt: new Date(),
          } as any;

          return {
            messages: {
              ...state.messages,
              [teamChatId]: updatedMessages,
            },
          };
        });
      },

      // Handle real-time message reactions from Redis
      handleRedisMessageReaction: (
        messageId: string,
        teamChatId: string,
        userId: string,
        reaction: string,
      ) => {
        console.log(
          `🔄 Redis: Handling message reaction: ${userId} reacted with ${reaction} to ${messageId} in ${teamChatId}`,
        );
        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const messageIndex = existingMessages.findIndex((m: any) => m.id === messageId);

          if (messageIndex === -1) {
            console.log(`   ❌ Message not found for Redis reaction: ${messageId}`);
            return state;
          }

          const updatedMessages = [...existingMessages];
          const currentMessage = updatedMessages[messageIndex] as any;

          // Initialize reactions if they don't exist
          if (!currentMessage.reactions) {
            currentMessage.reactions = {};
          }

          // Add or update reaction
          if (!currentMessage.reactions[reaction]) {
            currentMessage.reactions[reaction] = [];
          }

          // Add user to reaction if not already there
          if (!currentMessage.reactions[reaction].includes(userId)) {
            currentMessage.reactions[reaction].push(userId);
          }

          updatedMessages[messageIndex] = {
            ...currentMessage,
            updatedAt: new Date(),
          };

          return {
            messages: {
              ...state.messages,
              [teamChatId]: updatedMessages,
            },
          };
        });
      },

      // Handle real-time read receipts from Redis
      handleRedisReadReceipt: (messageId: string, teamChatId: string, userId: string) => {
        console.log(
          `🔄 Redis: Handling read receipt: ${userId} read ${messageId} in ${teamChatId}`,
        );
        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          const messageIndex = existingMessages.findIndex((m: any) => m.id === messageId);

          if (messageIndex === -1) {
            console.log(`   ❌ Message not found for Redis read receipt: ${messageId}`);
            return state;
          }

          const updatedMessages = [...existingMessages];
          const currentMessage = updatedMessages[messageIndex] as any;

          // Initialize read receipts if they don't exist
          if (!currentMessage.readReceipts) {
            currentMessage.readReceipts = {};
          }

          // Mark message as read by user
          currentMessage.readReceipts[userId] = new Date().toISOString();

          updatedMessages[messageIndex] = {
            ...currentMessage,
            updatedAt: new Date(),
          };

          return {
            messages: {
              ...state.messages,
              [teamChatId]: updatedMessages,
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

            const sessionResult = await lambdaClient.session.createSession.mutate({
              config: {
                model: DEFAULT_AGENT_CONFIG.model,
                provider: DEFAULT_AGENT_CONFIG.provider,
                systemRole: DEFAULT_AGENT_CONFIG.systemRole,
                params: DEFAULT_AGENT_CONFIG.params as any,
              },
              session: {
                title: title,
                type: 'agent',
              },
              type: 'agent',
            });

            const chat = await lambdaClient.teamChat.createTeamChat.mutate({
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
                sessionId: sessionResult,
              },
            });

            newChatId = chat.id;

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
          console.log('�� Loading team chats for organization:', organizationId);

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
          // Only update currentOrganizationId if it's different to prevent infinite loops
          const currentState = get();
          set((state) => ({
            teamChatsByOrg: {
              ...state.teamChatsByOrg,
              [organizationId]: chats,
            },
            currentOrganizationId:
              currentState.currentOrganizationId === organizationId
                ? currentState.currentOrganizationId
                : organizationId,
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

      // Method to load messages with proper ordering and deduplication
      loadMessages: async (teamChatId: string, limit: number = 50, offset?: number) => {
        try {
          set((state) => ({
            activeChatStates: {
              ...state.activeChatStates,
              [teamChatId]: {
                ...(state.activeChatStates?.[teamChatId] || {
                  isActive: false,
                  isLoading: true,
                  lastViewedAt: 0,
                  hasMoreMessages: false,
                  lastMessageId: undefined,
                  pageSize: limit,
                  currentPage: offset ? Math.floor(offset / limit) + 1 : 1,
                  presence: {},
                  typingUsers: {},
                  readReceipts: {},
                }),
                isLoading: true,
              },
            },
          }));

          let messages: TeamChatMessageItem[] = [];

          if (isServerMode) {
            const { lambdaClient } = await import('@/libs/trpc/client/lambda');
            messages = await lambdaClient.teamChat.getMessages.query({
              teamChatId,
              limit,
              offset,
            });
          } else {
            const service = await getTeamChatService();
            messages = await service.getMessages(teamChatId, limit, offset);
          }

          // Ensure messages are properly sorted chronologically
          const sortedMessages = messages.sort((a, b) => {
            const dateA =
              a.createdAt instanceof Date
                ? a.createdAt.getTime()
                : typeof a.createdAt === 'string'
                  ? new Date(a.createdAt).getTime()
                  : 0;
            const dateB =
              b.createdAt instanceof Date
                ? b.createdAt.getTime()
                : typeof b.createdAt === 'string'
                  ? new Date(b.createdAt).getTime()
                  : 0;

            if (dateA !== dateB) return dateA - dateB;
            return a.id.localeCompare(b.id);
          });

          // Update store with loaded messages
          set((state) => {
            const existingMessages = state.messages[teamChatId] || [];
            const messageMap = new Map(existingMessages.map((m) => [m.id, m]));

            // Add new messages, preserving existing ones
            sortedMessages.forEach((message) => {
              messageMap.set(message.id, message);
            });

            const allMessages = Array.from(messageMap.values()).sort((a, b) => {
              const dateA =
                a.createdAt instanceof Date
                  ? a.createdAt.getTime()
                  : typeof a.createdAt === 'string'
                    ? new Date(a.createdAt).getTime()
                    : 0;
              const dateB =
                b.createdAt instanceof Date
                  ? b.createdAt.getTime()
                  : typeof b.createdAt === 'string'
                    ? new Date(b.createdAt).getTime()
                    : 0;

              if (dateA !== dateB) return dateA - dateB;
              return a.id.localeCompare(b.id);
            });

            return {
              messages: {
                ...state.messages,
                [teamChatId]: allMessages,
              },
              activeChatStates: {
                ...state.activeChatStates,
                [teamChatId]: {
                  ...(state.activeChatStates?.[teamChatId] || {
                    isActive: false,
                    isLoading: true,
                    lastViewedAt: 0,
                    hasMoreMessages: false,
                    lastMessageId: undefined,
                    pageSize: limit,
                    currentPage: offset ? Math.floor(offset / limit) + 1 : 1,
                    presence: {},
                    typingUsers: {},
                    readReceipts: {},
                  }),
                  isLoading: false,
                  hasMoreMessages: messages.length === limit,
                  currentPage: offset ? Math.floor(offset / limit) + 1 : 1,
                },
              },
            };
          });

          console.log(`✅ Loaded ${sortedMessages.length} messages for team chat: ${teamChatId}`);
        } catch (error) {
          console.error('Failed to load messages:', error);
          set((state) => ({
            error: error instanceof Error ? error.message : 'Failed to load messages',
            activeChatStates: {
              ...state.activeChatStates,
              [teamChatId]: {
                ...(state.activeChatStates?.[teamChatId] || {
                  isActive: false,
                  isLoading: true,
                  lastViewedAt: 0,
                  hasMoreMessages: false,
                  lastMessageId: undefined,
                  pageSize: 50,
                  currentPage: 1,
                  presence: {},
                  typingUsers: {},
                  readReceipts: {},
                }),
                isLoading: false,
              },
            },
          }));
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

          // Note: Credit and usage limits are enforced server-side when the message is processed
          // Client-side pre-checks have been removed to avoid bundling server-side dependencies

          // Create the message object
          const newMessage = {
            id: messageId || `temp-${Date.now()}`,
            content,
            messageType,
            teamChatId,
            metadata: messageMetadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Use upsertMessages to ensure proper ordering and consistency
          get().addMessage(teamChatId, newMessage as any);

          // Then persist to database in background
          let message;
          if (isServerMode) {
            // console.log('🚄 Using tRPC client to send message');
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

          // Track credit consumption for AI-generated messages
          if (messageType === 'assistant' && message?.id) {
            try {
              const state = get();
              const currentUser = useUserStore.getState().user;
              if (currentUser) {
                await state.creditService.trackMessageCredits(
                  currentUser.id,
                  teamChatId,
                  message.id,
                  messageType,
                  messageMetadata,
                );
              }
            } catch (error) {
              console.error('❌ Failed to track credits for team chat message:', error);
              // Don't throw error to avoid breaking the message flow
            }
          }

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
        const { currentOrganizationId, isLoading } = get();

        // Prevent duplicate calls if already loading
        if (isLoading) {
          console.log('⚠️ Already loading team chats, skipping duplicate call');
          return;
        }

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

      // Centralized message management - single source of truth for all message operations
      addMessage: async (teamChatId: string, message: any) => {
        const messageId = message.id || `msg_${Date.now()}_${nanoid(10)}`;
        const timestamp = new Date().toISOString();

        const messageData = {
          id: messageId,
          content: message.content,
          messageType: message.messageType,
          teamChatId,
          userId: message.userId,
          metadata: message.metadata || {},
          createdAt: timestamp,
          updatedAt: timestamp,
          sendTime: message.sendTime,
        };

        set((state: any) => {
          const existingMessages = state.messages[teamChatId] || [];

          const isDuplicate = existingMessages.some(
            (existing: any) =>
              existing.id === messageId ||
              (existing.content === message.content &&
                existing.userId === message.userId &&
                Math.abs(new Date(existing.createdAt).getTime() - new Date(timestamp).getTime()) < 1000),
          );

          if (isDuplicate) {
            console.log(`�� Skipping duplicate message: ${messageId}`);
            return state;
          }

          const updatedMessages = [...existingMessages, messageData];

          const sortedMessages = updatedMessages.sort((a, b) => {
            const tsA = new Date(a.createdAt).getTime();
            const tsB = new Date(b.createdAt).getTime();

            if (tsA !== tsB) return tsA - tsB;
            if (a.userId !== b.userId) {
              return a.metadata?.userInfo?.id === 'assistant' ? 1 : -1;
            }
            return a.id.localeCompare(b.id);
          });

          return {
            messages: {
              ...state.messages,
              [teamChatId]: sortedMessages,
            },
          };
        });

        return messageData;
      },

      // Batch update messages (for WebSocket reconciliation)
      batchUpdateMessages: (teamChatId: string, newMessages: any[]) => {
        set((state) => {
          const existingMessages = state.messages[teamChatId] || [];
          
          const messageMap = new Map<string, any>();
          
          // Add existing
          existingMessages.forEach((msg) => {
            if (msg.id) messageMap.set(msg.id, msg);
          });
          
          // Add/merge new
          newMessages.forEach((msg) => {
            if (msg.id) {
              messageMap.set(msg.id, {
                ...messageMap.get(msg.id),
                ...msg,
              });
            }
          });
          
          const mergedMessages = Array.from(messageMap.values());
          
          // Sorting
          const sortedMessages = mergedMessages.sort((a, b) => {
            const getTimestamp = (msg: any): number => {
              if (msg.createdAt instanceof Date) return msg.createdAt.getTime();
              if (typeof msg.createdAt === "string") {
                // Handle PostgreSQL timestamp formats
                // Examples: "2025-09-01 09:25:12.564+00", "2025-09-01T09:25:12.564Z", etc.
                let timestampString = msg.createdAt.trim();
                
                // Convert PostgreSQL format to ISO format if needed
                if (timestampString.includes(' ') && !timestampString.includes('T')) {
                  // Replace space with 'T' for ISO format
                  timestampString = timestampString.replace(' ', 'T');
                }
                
                // Handle timezone offset format (+00 instead of +00:00)
                if (/[+-]\d{2}$/.test(timestampString)) {
                  timestampString += ':00';
                }
                
                // If no timezone info, assume UTC
                if (!timestampString.includes('+') && !timestampString.includes('-') && !timestampString.endsWith('Z')) {
                  timestampString += 'Z';
                }
                
                const parsed = new Date(timestampString).getTime();
                return isNaN(parsed) ? 0 : parsed;
              }
              return 0;
            };
            
            const tsA = getTimestamp(a);
            const tsB = getTimestamp(b);
            
            // 1. chronological order
           
            if (tsA !== tsB) return tsA - tsB;
            
            console.log("User Message before assistant");
            
            // 2. user messages before assistant
            const isAssistantA = a.metadata?.userInfo?.id === "assistant";
            const isAssistantB = b.metadata?.userInfo?.id === "assistant";
            if (isAssistantA !== isAssistantB) return isAssistantA ? 1 : -1;
            
            // 3. fallback by ID
            return String(a.id).localeCompare(String(b.id));
          });
          
          return {
            messages: {
              ...state.messages,
              [teamChatId]: sortedMessages,
            },
          };
        });
      },
      
      

      // Method to persist message to database
      persistMessageToDatabase: async (teamChatId: string, messageData: any) => {
        console.log(`💾 persistMessageToDatabase called:`, {
          teamChatId,
          messageId: messageData.id,
          messageType: messageData.messageType,
          isServerMode,
          contentPreview: messageData.content.substring(0, 100),
        });

        try {
          if (isServerMode) {
            console.log(`   🚄 Using server mode (lambda client)`);
            const { lambdaClient } = await import('@/libs/trpc/client/lambda');
            const result = await lambdaClient.teamChat.addMessage.mutate({
              teamChatId,
              content: messageData.content,
              messageType: messageData.messageType,
              metadata: messageData.metadata || {},
            });
            console.log(`   ✅ Server mode persistence successful:`, result);
          } else {
            console.log(`   📱 Using client mode (PGlite)`);
            const service = await getTeamChatService();
            // Exclude isLocal from database persistence until migration is run
            const { isLocal, ...dbMessageData } = messageData as any;
            const result = await service.addMessageToChat(teamChatId, {
              content: dbMessageData.content,
              messageType: dbMessageData.messageType,
              id: dbMessageData.id,
              metadata: dbMessageData.metadata || {},
            });
            console.log(`   ✅ Client mode persistence successful:`, result);
          }
        } catch (error) {
          console.error('❌ Failed to persist message:', error);
          throw error;
        }
      },
      // getMessageById: (id: string) => {
      //   const { messages } = get();
      //   return Object.values(messages)
      //     .flat()
      //     .find((message) => message.id === id);
      // },
    }),
    {
      name: 'team-chat-store',
    },
  ),
);
