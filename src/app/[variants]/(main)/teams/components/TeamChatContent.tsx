'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useTeamChatWebSocket } from '@/hooks/useTeamChatWebSocket';
import { lambdaClient } from '@/libs/trpc/client';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import TeamChatLayout from './layout/TeamChatLayout';
import { useTheme } from 'antd-style';
import Loading from '../../chat/loading';

interface TeamChatContentProps {
  teamChatId: string;
  mobile: boolean;
  onNewChat: () => Promise<void>;
}

const useChatSwitchManager = (chatId: string | null) => {
  const [switchState, setSwitchState] = useState<{
    isPending: boolean;
    previousChatId: string | null;
    nextChatId: string | null;
  }>({
    isPending: false,
    previousChatId: null,
    nextChatId: null,
  });

  useEffect(() => {
    if (!chatId) return;

    setSwitchState((prev) => ({
      isPending: true,
      previousChatId: prev.nextChatId,
      nextChatId: chatId,
    }));

    // Simulate a minimum transition time for better UX
    const timer = setTimeout(() => {
      setSwitchState((prev) => ({
        ...prev,
        isPending: false,
      }));
    }, 300);

    return () => clearTimeout(timer);
  }, [chatId]);

  return switchState;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 50;

const TeamChatContent: React.FC<TeamChatContentProps> = memo(
  ({ teamChatId, mobile, onNewChat }) => {
    const switchState = useChatSwitchManager(teamChatId);
    const { teamChatsByOrg, setActiveTeamChat, currentOrganizationId, activeChatStates } =
      useTeamChatStore();
    const currentUser = useUserStore(userProfileSelectors.userProfile);
    
    // Track if initial load has been performed for this chat
    const initialLoadRef = useRef<Set<string>>(new Set());

    // Get chats for current organization
    const teamChats = currentOrganizationId ? teamChatsByOrg[currentOrganizationId] || [] : [];

    // Find the current chat
    const currentChat = teamChats.find((chat) => chat.id === teamChatId);

    // Get chat activity state with default values
    const chatState = teamChatId ? activeChatStates?.[teamChatId] : undefined;
    const defaultState = {
      isActive: false,
      isLoading: false,
      lastViewedAt: Date.now(),
      hasMoreMessages: true,
      pageSize: PAGE_SIZE,
      currentPage: 1,
    };
    const currentState = chatState || defaultState;
    const isActive = currentState.isActive;
    const isLoading = currentState.isLoading;

    // Function to check if cached messages are valid
    const isCacheValid = (chatId: string) => {
      if (!chatId) return false;

      const store = useTeamChatStore.getState();
      if (!store?.messageCache) return false;

      const cache = store.messageCache[chatId];
      if (!cache?.expiresAt) return false;

      try {
        const expiresAt = parseInt(cache.expiresAt, 10);
        if (isNaN(expiresAt)) return false;

        return Date.now() < expiresAt;
      } catch (error) {
        console.error('Error parsing cache expiration:', error);
        return false;
      }
    };

    // Function to load messages with pagination - wrapped in useCallback to prevent infinite loops
    const loadMessages = useCallback(
      async (page: number = 1) => {
        if (!teamChatId) return;

        const chatState = useTeamChatStore.getState().activeChatStates[teamChatId];
        if (!chatState?.isActive) return;

        try {
          useTeamChatStore.setState((state) => ({
            activeChatStates: {
              ...(state.activeChatStates || {}),
              [teamChatId]: {
                ...(state.activeChatStates?.[teamChatId] || defaultState),
                isLoading: true,
              },
            },
          }));

          const messages = await lambdaClient.teamChat.getMessages.query({
            teamChatId: teamChatId!,
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
            lastMessageId: chatState.lastMessageId,
          });

          const hasMore = messages.length === PAGE_SIZE;

          // Apply consistent sorting logic for messages
          const sortMessages = (messagesToSort: any[]) => {
            return messagesToSort.sort((a, b) => {
              // Parse timestamps to numbers for comparison
              const getTimestamp = (msg: any): number => {
                if (msg.createdAt instanceof Date) {
                  return msg.createdAt.getTime();
                }
                if (typeof msg.createdAt === "string") {
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
                if (a.userId === "assistant") return 1;
                if (b.userId === "assistant") return -1;
              }
        
              // Third priority: if still equal, sort by ID for consistency
              return a.id.localeCompare(b.id);
            });
          };

          const sortedMessages = page === 1 
            ? sortMessages(messages) 
            : sortMessages([...(useTeamChatStore.getState().messages[teamChatId] || []), ...messages]);

          useTeamChatStore.setState((state) => ({
            messages: {
              ...state.messages,
              [teamChatId]: sortedMessages,
            },
            activeChatStates: {
              ...(state.activeChatStates || {}),
              [teamChatId]: {
                ...(state.activeChatStates?.[teamChatId] || defaultState),
                isLoading: false,
                currentPage: page,
                hasMoreMessages: hasMore,
                lastMessageId: messages[messages.length - 1]?.id,
              },
            },
          }));

          // Cache the messages
          if (page === 1) {
            useTeamChatStore.setState((state) => ({
              messageCache: {
                ...state.messageCache,
                [teamChatId]: {
                  messages,
                  timestamp: Date.now().toString(),
                  expiresAt: (Date.now() + CACHE_DURATION).toString(),
                },
              },
            }));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error('Failed to load messages:', error);
          useTeamChatStore.setState((state) => ({
            error: errorMessage,
            activeChatStates: {
              ...(state.activeChatStates || {}),
              [teamChatId]: {
                ...(state.activeChatStates?.[teamChatId] || defaultState),
                isLoading: false,
              },
            },
          }));
        }
      },
      [teamChatId],
    );

    // Function to load more messages
    const handleLoadMore = useCallback(async () => {
      const chatState = useTeamChatStore.getState().activeChatStates[teamChatId];
      if (chatState?.isLoading || !chatState?.hasMoreMessages) return;
      await loadMessages(chatState.currentPage + 1);
    }, [teamChatId, loadMessages]);

    // Initial load of messages - only load once per chat ID
    useEffect(() => {
      if (!teamChatId || isCacheValid(teamChatId)) return;
      
      // Check if we've already loaded messages for this chat
      if (initialLoadRef.current.has(teamChatId)) return;
      
      // Mark this chat as having been loaded
      initialLoadRef.current.add(teamChatId);
      
      // Load messages
      loadMessages(1);
    }, [teamChatId, loadMessages]);

    // Use WebSocket for real-time updates instead of polling
    const { sendMessage, startTyping, stopTyping, updateReadReceipt } = useTeamChatWebSocket({
      teamChatId,
      enabled: isActive,
    });

    // Get messages from store (updated via WebSocket) - Fixed to return stable reference
    const messages = useTeamChatStore((state) => state.messages[teamChatId] || null);

    // Memoize messages to prevent infinite re-renders
    const memoizedMessages = useMemo(() => messages || [], [messages]);

    // Set up chat activity tracking
    useEffect(() => {
      if (!teamChatId || !currentUser?.id) return;

      // Mark chat as active
      useTeamChatStore.setState((state) => ({
        activeChatStates: {
          ...(state.activeChatStates || {}),
          [teamChatId]: {
            ...(state.activeChatStates?.[teamChatId] || defaultState),
            isActive: true,
            lastViewedAt: Date.now(),
          },
        },
      }));

      // Cleanup function
      return () => {
        if (!teamChatId || !currentUser?.id) return;

        const state = useTeamChatStore.getState();
        const messages = state.messages[teamChatId];

        // Real-time updates are now handled by WebSocket in useTeamChatWebSocket hook

        if (messages?.length > 0) {
          // Cache messages before unmounting
          useTeamChatStore.setState((state) => ({
            messageCache: {
              ...state.messageCache,
              [teamChatId]: {
                messages,
                timestamp: Date.now().toString(),
                expiresAt: (Date.now() + CACHE_DURATION).toString(),
              },
            },
            activeChatStates: {
              ...state.activeChatStates,
              [teamChatId]: {
                ...state.activeChatStates[teamChatId],
                isActive: false,
                isLoading: false,
              },
            },
          }));
        } else {
          // Just update activity state if no messages to cache
          useTeamChatStore.setState((state) => ({
            activeChatStates: {
              ...state.activeChatStates,
              [teamChatId]: {
                ...state.activeChatStates[teamChatId],
                isActive: false,
                isLoading: false,
              },
            },
          }));
        }
      };
    }, [teamChatId, currentUser?.id]);

    // Now handle conditional rendering after all hooks have been called
    if (!currentChat) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <p>No active chat found.</p>
            <button
              onClick={onNewChat}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
            >
              Create New Chat
            </button>
          </div>
        </div>
      );
    }

    const theme = useTheme();

    // Render loading state
    if (!currentChat || !chatState) {
      return (
        <div className={`flex-1 flex items-center justify-center text-slate-400  ${theme.appearance === "dark" ? "bg-black" : "bg-white"}`}>
          <div className="text-center">
            <Loading />
          </div>
        </div>
      );
    }

    // Render error state
    if (useTeamChatStore.getState().error) {
      return (
        <div className="flex-1 flex items-center justify-center text-red-500">
          <div className="text-center">
            <p>Error: {useTeamChatStore.getState().error}</p>
            <button
              onClick={() => {
                useTeamChatStore.setState({ error: null });
                loadMessages(1);
              }}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
      style={{
        position: 'relative',
        height: '100%',
        opacity: switchState.isPending ? 0 : 1,
        transform: `translateX(${switchState.isPending ? '100%' : '0'})`,
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
      }}
    >
      {/* Loading overlay */}
      {isLoading && !switchState.isPending && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading messages...</p>
          </div>
        </div>
      )}

      {/* Load more button */}
      {chatState.hasMoreMessages && !isLoading && !switchState.isPending && (
        <button
          onClick={handleLoadMore}
          className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded self-center"
        >
          Load More Messages
        </button>
      )}

      {/* Only show TeamChatLayout when not loading */}
      {!isLoading && !switchState.isPending && (
        <TeamChatLayout
          teamChatId={teamChatId}
          mobile={mobile}
          isLoading={isLoading}
          isTransitioning={switchState.isPending}
        />
      )}
    </div>
    );
  },
);

TeamChatContent.displayName = 'TeamChatContent';

export default TeamChatContent;
