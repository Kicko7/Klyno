'use client';

import { ModelTag } from '@lobehub/icons';
import { useTheme } from 'antd-style';
import isEqual from 'lodash/isEqual';
import React, { useCallback, useMemo } from 'react';
import { memo, useEffect, useRef } from 'react';
import { Flexbox } from 'react-layout-kit';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isMessageEditing = useTeamChatStore((state) => state.messageEditingIds);
  const toggleMessageEditing = useTeamChatStore((state) => state.toggleMessageEditing);
  const updateMessage = useTeamChatStore((state) => state.updateMessage);
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);
  
  useEffect(() => {
    const id = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(id);
  }, [messages.length, scrollToBottom]);

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

  return (
    <div
      style={{
        padding: '16px',
        width: '100%',
        height: '80vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start', // Start from top, messages flow down
        gap: '16px',
      }}
    >
      {messages
        .filter((message) => {
          // Filter out invalid or unwanted messages
          if (!message || !message.id) return false;
          if (!message.content && message.content !== 'Thinking...') return false;
          if (message.content === 'Thinking...' && message.messageType !== 'assistant')
            return false;
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
        })
        .map((message, index) => {
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
                title:
                  userInfo?.fullName || userInfo?.username || userInfo?.email || 'Unknown User',
              };

          // If this is an API key error, show the configuration form
          if (isApiKeyError) {
            return (
              <div key={message.id} style={{ margin: '16px 0' }}>
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
            <ChatItem
              style={{
                color: theme.appearance === 'dark' ? '#fefefe' : '#080808',
                borderRadius: 8,
                padding: 8,
              }}
              key={message.id}
              avatar={avatar}
              actions={<TeamChatActions id={message.id} index={index} />}
              editing={isMessageEditing.includes(message.id)}
              loading={message?.content === 'Thinking...' ? true : false} // Show loading for empty assistant messages
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
                    <span>🤖 AI Assistant</span>
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
                    {/* {userInfo.email && userInfo.username && <span>•</span>} */}
                    {/* {userInfo.username && <span>@{userInfo.username}</span>} */}
                  </div>
                ) : undefined
              }
              variant={'bubble'}
            />
          );
        })}
      {/* Invisible div to help with auto-scrolling */}
      <div ref={messagesEndRef} />
    </div>
  );
});

TeamChatMessages.displayName = 'TeamChatMessages';

export default TeamChatMessages;
