import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TeamChatItem, TeamChatMessageItem } from '@/database/schemas/teamChat';
import { TeamChatService } from '@/services/teamChatService';
import { useUserStore } from '@/store/user';
import { isServerMode } from '@/const/version';
import { lambdaClient } from '@/libs/trpc/client';

interface TeamChatState {
  // State
  teamChats: TeamChatItem[];
  activeTeamChatId: string | null;
  messages: Record<string, TeamChatMessageItem[]>; // teamChatId -> messages
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  // Actions
  createTeamChat: (organizationId: string, title?: string) => Promise<string>;
  loadTeamChats: (organizationId: string) => Promise<void>;
  setActiveTeamChat: (id: string) => void;
  updateTeamChat: (id: string, data: { title?: string; description?: string; metadata?: any }) => Promise<void>;
  deleteTeamChat: (id: string) => Promise<void>;
  loadMessages: (teamChatId: string) => Promise<void>;
  sendMessage: (teamChatId: string, content: string) => Promise<void>;
  clearError: () => void;
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
    if (currentState.initClientDBStage !== DatabaseLoadingState.Ready && currentState.initClientDBStage !== DatabaseLoadingState.Finished) {
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
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
        console.log(`⏳ Still waiting for database... (${retries}/${maxRetries}) - State: ${currentState.initClientDBStage}`);
      }
      
      currentState = useGlobalStore.getState();
      if (currentState.initClientDBStage !== DatabaseLoadingState.Ready) {
        throw new Error(`Database initialization timeout. Current state: ${currentState.initClientDBStage}`);
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
      teamChats: [],
      activeTeamChatId: null,
      messages: {},
      isLoading: false,
      isLoadingMessages: false,
      error: null,

      // Create a new team chat
      createTeamChat: async (organizationId: string, title = 'Team Chat') => {
        try {
          set({ isLoading: true, error: null });
          console.log('🚀 Creating team chat for organization:', organizationId);

          let newChatId: string;
          
          if (isServerMode) {
            console.log('🚄 Using tRPC client for server mode');
            newChatId = await lambdaClient.teamChat.createTeamChat.mutate({
              organizationId,
              title,
            });
            
            // For server mode, we need to reload the list to get the full object
            const chats = await lambdaClient.teamChat.getTeamChatsByOrganization.query({ organizationId });
            const newChat = chats.find(chat => chat.id === newChatId);
            
            if (newChat) {
              set(state => ({
                teamChats: [...state.teamChats, newChat],
                activeTeamChatId: newChat.id,
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
                teamMembers: [],
              },
            });
            
            newChatId = newChat.id;
            
            // Add to state
            set(state => ({
              teamChats: [...state.teamChats, newChat],
              activeTeamChatId: newChat.id,
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

      // Load all team chats for an organization
      loadTeamChats: async (organizationId: string) => {
        try {
          set({ isLoading: true, error: null });
          console.log('📥 Loading team chats for organization:', organizationId);

          let chats: TeamChatItem[];
          
          if (isServerMode) {
            console.log('🚄 Using tRPC client for server mode');
            chats = await lambdaClient.teamChat.getTeamChatsByOrganization.query({ organizationId });
          } else {
            const service = await getTeamChatService();
            chats = await service.getChatsByOrganization(organizationId);
          }

          console.log('✅ Loaded team chats:', chats.length);

          set({
            teamChats: chats,
            isLoading: false,
          });
        } catch (error) {
          console.error('❌ Failed to load team chats:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load team chats',
            isLoading: false,
          });
        }
      },

      // Set active team chat
      setActiveTeamChat: (id: string) => {
        console.log('🎯 Setting active team chat:', id);
        set({ activeTeamChatId: id });
      },

      // Update a team chat
      updateTeamChat: async (id: string, data: { title?: string; description?: string; metadata?: any }) => {
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
          set(state => ({
            teamChats: state.teamChats.map(chat => 
              chat.id === id ? { ...chat, ...updatedChat } : chat
            ),
            isLoading: false,
          }));

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
          set(state => ({
            teamChats: state.teamChats.filter(chat => chat.id !== id),
            activeTeamChatId: state.activeTeamChatId === id ? null : state.activeTeamChatId,
            isLoading: false,
          }));

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

          set(state => ({
            messages: {
              ...state.messages,
              [teamChatId]: messages,
            },
            isLoadingMessages: false,
          }));

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
      sendMessage: async (teamChatId: string, content: string) => {
        try {
          console.log('📤 Sending message to team chat:', teamChatId);

          let message;
          if (isServerMode) {
            console.log('🚄 Using tRPC client to send message');
            message = await lambdaClient.teamChat.addMessage.mutate({
              teamChatId,
              content,
            });
          } else {
            const service = await getTeamChatService();
            message = await service.addMessageToChat(teamChatId, {
              content,
            });
          }

          set(state => ({
            messages: {
              ...state.messages,
              [teamChatId]: [...(state.messages[teamChatId] || []), message],
            },
          }));

          console.log('✅ Message sent');
        } catch (error) {
          console.error('❌ Failed to send message:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to send message',
          });
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'team-chat-store',
    }
  )
);
