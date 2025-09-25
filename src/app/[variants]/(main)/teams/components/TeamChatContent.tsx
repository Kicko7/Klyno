'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { memo } from 'react';

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

    // WebSocket-only message loading - no database calls
    const initializeChatState = useCallback(() => {
      if (!teamChatId) return;

      // Initialize chat state for WebSocket-only mode
      useTeamChatStore.setState((state) => ({
        activeChatStates: {
          ...(state.activeChatStates || {}),
          [teamChatId]: {
            ...(state.activeChatStates?.[teamChatId] || defaultState),
            isActive: true,
            isLoading: false, // No loading since we're using WebSocket
            hasMoreMessages: false, // WebSocket handles all messages
            currentPage: 1,
          },
        },
        // Initialize empty messages array if not exists
        messages: {
          ...state.messages,
          [teamChatId]: state.messages[teamChatId] || [],
        },
      }));
    }, [teamChatId]);

    // // Function to load more messages
    // const handleLoadMore = useCallback(async () => {
    //   const chatState = useTeamChatStore.getState().activeChatStates[teamChatId];
    //   if (chatState?.isLoading || !chatState?.hasMoreMessages) return;
    //   await loadMessages(chatState.currentPage + 1);
    // }, [teamChatId, loadMessages]);

    // Initialize chat state for WebSocket-only mode
    useEffect(() => {
      if (!teamChatId) return;
      
      // Check if we've already initialized this chat
      if (initialLoadRef.current.has(teamChatId)) return;
      
      // Mark this chat as having been initialized
      initialLoadRef.current.add(teamChatId);
      
      // Initialize chat state (WebSocket will handle message loading)
      initializeChatState();
    }, [teamChatId, initializeChatState]);


    // Get messages from store (updated via WebSocket) - Fixed to return stable reference
    const messages = useTeamChatStore((state) => state.messages[teamChatId] || []);

    // Memoize messages to prevent infinite re-renders
    const memoizedMessages = useMemo(() => {
      if (!Array.isArray(messages)) return [];
      return messages;
    }, [messages]);

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
                // loadMessages(1);
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
          // onClick={handleLoadMore}
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
