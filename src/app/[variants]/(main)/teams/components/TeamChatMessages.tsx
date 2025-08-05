'use client';

import { ModelTag } from '@lobehub/icons';
import { useTheme } from 'antd-style';
import isEqual from 'lodash/isEqual';
import React from 'react';
import { memo, useEffect, useRef } from 'react';
import { Flexbox } from 'react-layout-kit';

import { DEFAULT_USER_AVATAR } from '@/const/meta';
import { TeamChatMessageItem } from '@/database/schemas/teamChat';
import ChatItem from '@/features/ChatItem';
import Usage from '@/features/Conversation/Extras/Usage';
import { useSessionStore } from '@/store/session';
import { sessionMetaSelectors } from '@/store/session/selectors';
import { sessionSelectors } from '@/store/session/slices/session/selectors';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import TeamAPIKeyForm from './TeamAPIKeyForm';
import TeamChatWelcome from './TeamChatWelcome';

interface TeamChatMessagesProps {
  messages: TeamChatMessageItem[];
  isLoading?: boolean;
}

const TeamChatMessages: React.FC<TeamChatMessagesProps> = memo(({ messages, isLoading }) => {
  const userAvatar = useUserStore(userProfileSelectors.userAvatar);
  const currentUser = useUserStore(userProfileSelectors.userProfile);
  const [agentMeta, currentSession] = useSessionStore(
    (s) => [sessionMetaSelectors.currentAgentMeta(s), sessionSelectors.currentSession(s)],
    isEqual,
  );
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <Flexbox
      style={{
        padding: '16px',
        width: '100%',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto',
      }}
      width={'100%'}
      height={'80vh'}
    >
      {messages.map((message) => {
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

        // Get user information from message metadata or fallback to current user
        const userInfo = message.metadata?.userInfo;
        const isCurrentUser = currentUser && userInfo && userInfo.id === currentUser.id;

        const avatar = isAssistant
          ? currentSession?.meta || agentMeta // Use current session meta or fallback to agent meta
          : {
              avatar: userInfo?.avatar || userAvatar || DEFAULT_USER_AVATAR,
              title: userInfo?.fullName || userInfo?.username || userInfo?.email || 'Unknown User',
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
            key={message.id}
            avatar={avatar}
            editing={false}
            loading={!message.content && isAssistant} // Show loading for empty assistant messages
            message={actualMessage || ''}
            placement={isAssistant ? 'left' : isCurrentUser ? 'right' : 'left'}
            primary={!isAssistant}
            time={new Date(message.createdAt).getTime()}
            messageExtra={
              isAssistant && (message.metadata as any)?.totalTokens ? (
                <Usage
                  metadata={(message.metadata as any) || {}}
                  model={(message.metadata as any)?.model || 'assistant'}
                  provider={(message.metadata as any)?.provider || 'openai'}
                />
              ) : !isAssistant && userInfo ? (
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
                  {userInfo.email && <span>{userInfo.email}</span>}
                  {userInfo.email && userInfo.username && <span>•</span>}
                  {userInfo.username && <span>@{userInfo.username}</span>}
                </div>
              ) : undefined
            }
            variant={'bubble'}
          />
        );
      })}
      {/* Invisible div to help with auto-scrolling */}
      <div ref={messagesEndRef} />
    </Flexbox>
  );
});

TeamChatMessages.displayName = 'TeamChatMessages';

export default TeamChatMessages;
