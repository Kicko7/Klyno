'use client';

import { ModelTag } from '@lobehub/icons';
import { useTheme } from 'antd-style';
import isEqual from 'lodash/isEqual';
import React, { useCallback, useMemo } from 'react';
import { memo, useEffect, useRef } from 'react';
import { Flexbox } from 'react-layout-kit';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { DEFAULT_USER_AVATAR } from '@/const/meta';
import { TeamChatMessageItem } from '@/database/schemas/teamChat';
import ChatItem from '@/features/ChatItem';
import Usage from '@/features/Conversation/Extras/Usage';
import ActionsBar from '@/features/Conversation/components/ChatItem/ActionsBar';
import { useSessionStore } from '@/store/session';
import { sessionMetaSelectors } from '@/store/session/selectors';
import { sessionSelectors } from '@/store/session/slices/session/selectors';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import TeamChatActions from '../[teamId]/components/TeamChatActions';
import TeamAPIKeyForm from './TeamAPIKeyForm';
import TeamChatWelcome from './TeamChatWelcome';

interface TeamChatMessagesProps {
  messages: TeamChatMessageItem[];
  isLoading?: boolean;
}

const TeamChatMessages: React.FC<TeamChatMessagesProps> = memo(({ messages, isLoading }) => {
  const userAvatar = useUserStore(userProfileSelectors.userAvatar);
  const currentUser = useUserStore(userProfileSelectors.userProfile);
  const theme = useTheme();
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const isMessageEditing = useTeamChatStore((state) => state.messageEditingIds);
  const toggleMessageEditing = useTeamChatStore((state) => state.toggleMessageEditing);
  const updateMessage = useTeamChatStore((state) => state.updateMessage);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      const id = requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          behavior: 'smooth',
          align: 'end',
        });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div>Loading messages...</div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return <TeamChatWelcome />;
  }

  // Filter and sort messages
  const filteredAndSortedMessages = useMemo(() => {
    return messages
      .filter((message) => {
        // Filter out invalid or unwanted messages
        if (!message || !message.id) return false;
        if (!message.content && message.content !== 'Thinking...') return false;
        if (message.content === 'Thinking...' && message.messageType !== 'assistant') return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by timestamp first, then ensure user messages come before assistant messages
        const getTimestamp = (msg: any): number => {
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
  }, [messages]);

  // Memoized message renderer for better performance
  const MessageRenderer = useCallback(
    ({ index }: { index: number }) => {
      const message = filteredAndSortedMessages[index];
      if (!message) return null;

      const isAssistant = message.messageType === 'assistant';
      let isApiKeyError = false;
      let errorProvider = 'openai';
      let actualMessage = message.content;

      if (isAssistant && message.content) {
        try {
          const parsed = JSON.parse(message.content);
          if (parsed.error?.type === 'InvalidProviderAPIKey') {
            isApiKeyError = true;
            errorProvider = parsed.error.body?.provider || 'openai';
            actualMessage = parsed.content || message.content;
          }
        } catch (e) {
          // Not JSON, use as regular message
        }
      }

      if (message.content === 'Thinking...') {
        actualMessage = '';
      }

      // Get user information from message metadata or fallback to current user
      const userInfo = message.metadata?.userInfo;
      const isCurrentUser = currentUser && userInfo && userInfo.id === currentUser.id;

      const avatar = isAssistant
        ? {
            avatar: '🤖', // AI emoji
            title: 'AI Assistant',
          }
        : {
            avatar: userInfo?.avatar || userAvatar || DEFAULT_USER_AVATAR,
            title: userInfo?.fullName || userInfo?.username || userInfo?.email || 'Unknown User',
          };

      // If this is an API key error, show the configuration form
      if (isApiKeyError) {
        return (
          <div style={{ margin: '16px 0' }}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '8px',
              }}
            >
              <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>
                🔑 API Key Required
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
                To continue chatting with the AI, please configure your{' '}
                {errorProvider.toUpperCase()} API key below:
              </div>
              <TeamAPIKeyForm id={message.id} provider={errorProvider} />
            </div>
          </div>
        );
      }

      return (
        <div style={{ padding: '8px 16px' }}>
          <ChatItem
            style={{
              color: theme.appearance === 'dark' ? '#fefefe' : '#080808',
              borderRadius: 8,
              padding: 8,
            }}
            avatar={avatar}
            actions={<TeamChatActions id={message.id} index={index} />}
            editing={isMessageEditing.includes(message.id)}
            loading={message?.content === 'Thinking...' ? true : false}
            message={actualMessage || ''}
            placement={isAssistant ? 'left' : isCurrentUser ? 'right' : 'left'}
            primary={!isAssistant}
            time={new Date(message.createdAt).getTime()}
            onChange={(value: string) => {
              // Update the message content in real-time during editing
              updateMessage(message.teamChatId, message.id, value);
            }}
            onEditingChange={(editing: boolean) => {
              // Toggle editing mode
              toggleMessageEditing(message.id, editing);
            }}
            messageExtra={
              isAssistant && (message.metadata as any)?.totalTokens ? (
                <Usage
                  metadata={(message.metadata as any) || {}}
                  model={(message.metadata as any)?.model || 'assistant'}
                  provider={(message.metadata as any)?.provider || 'openai'}
                />
              ) : isAssistant ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: theme.colorTextSecondary,
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>�� AI Assistant</span>
                  {(message.metadata as any)?.model && (
                    <>
                      <span>•</span>
                      <span>{(message.metadata as any)?.model}</span>
                    </>
                  )}
                  {(message.metadata as any)?.provider && (
                    <>
                      <span>•</span>
                      <span>{(message.metadata as any)?.provider}</span>
                    </>
                  )}
                </div>
              ) : !isAssistant && userInfo ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: theme.colorTextSecondary,
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexDirection: 'column',
                  }}
                >
                  {Array.isArray(message?.metadata?.files) &&
                    message.metadata.files.length > 0 &&
                    (() => {
                      const firstImage = message.metadata.files.find(
                        (file) => file.type && file.type.startsWith('image/'),
                      );

                      return firstImage ? (
                        <img
                          src={firstImage.url}
                          alt={firstImage.name}
                          style={{
                            maxWidth: '150px',
                            borderRadius: '8px',
                            maxHeight: '150px',
                            objectFit: 'contain',
                          }}
                        />
                      ) : null;
                    })()}
                  {userInfo.email && <span>{userInfo.email}</span>}
                </div>
              ) : undefined
            }
            variant={'bubble'}
          />
        </div>
      );
    },
    [
      filteredAndSortedMessages,
      currentUser,
      userAvatar,
      theme,
      isMessageEditing,
      toggleMessageEditing,
      updateMessage,
    ],
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '500px',
      }}
    >
      <Virtuoso
        ref={virtuosoRef}
        data={filteredAndSortedMessages}
        itemContent={(index) => MessageRenderer({ index })}
        height={500}
        style={{
          // height: ,
          minHeight: '500px',
        }}
        followOutput={true}
        alignToBottom={true}
        initialTopMostItemIndex={filteredAndSortedMessages.length - 1}
        overscan={5}
        increaseViewportBy={{ top: 100, bottom: 100 }}
        components={{
          Footer: () => <div style={{ height: '16px' }} />,
        }}
        // Add error handling for zero-sized element
        totalListHeightChanged={(height) => {
          if (height === 0) {
            console.warn('Virtuoso detected zero height, forcing re-render');
            // Force a re-render after a short delay
            setTimeout(() => {
              if (virtuosoRef.current) {
                virtuosoRef.current.scrollToIndex({
                  index: 0,
                  behavior: 'auto',
                });
              }
            }, 100);
          }
        }}
      />
    </div>
  );
});

TeamChatMessages.displayName = 'TeamChatMessages';

export default TeamChatMessages;
