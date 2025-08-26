'use client';

import { useTheme } from 'antd-style';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { DEFAULT_USER_AVATAR } from '@/const/meta';
import { TeamChatMessageItem } from '@/database/schemas/teamChat';
import ChatItem from '@/features/ChatItem';
import Usage from '@/features/Conversation/Extras/Usage';
import { useTeamChatWebSocket } from '@/hooks/useTeamChatWebSocket';
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

// Memoized components for better performance
const LoadingState = memo(() => (
  <div className="flex-1 flex items-center justify-center text-slate-400">
    <div>Loading messages...</div>
  </div>
));
LoadingState.displayName = 'LoadingState';

const APIKeyErrorMessage = memo<{
  messageId: string;
  errorProvider: string;
}>(({ messageId, errorProvider }) => (
  <div
    style={{
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
      padding: '16px',
    }}
  >
    <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>
      🔑 API Key Required
    </div>
    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
      To continue chatting with the AI, please configure your {errorProvider.toUpperCase()} API key
      below:
    </div>
    <TeamAPIKeyForm id={messageId} provider={errorProvider} />
  </div>
));
APIKeyErrorMessage.displayName = 'APIKeyErrorMessage';

// Optimized message extra content components
const AssistantExtra = memo<{
  metadata: any;
  theme: any;
}>(({ metadata, theme }) => {
  if (metadata?.totalTokens) {
    return (
      <Usage
        metadata={metadata}
        model={metadata?.model || 'assistant'}
        provider={metadata?.provider || 'openai'}
      />
    );
  }

  return (
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
      {metadata?.model && (
        <>
          <span>•</span>
          <span>{metadata.model}</span>
        </>
      )}
      {metadata?.provider && (
        <>
          <span>•</span>
          <span>{metadata.provider}</span>
        </>
      )}
    </div>
  );
});
AssistantExtra.displayName = 'AssistantExtra';

const UserExtra = memo<{
  userInfo: any;
  files: any[];
  theme: any;
}>(({ userInfo, files, theme }) => (
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
    {Array.isArray(files) &&
      files.length > 0 &&
      (() => {
        const firstImage = files.find((file) => file.type?.startsWith('image/'));
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
            loading="lazy"
          />
        ) : null;
      })()}
    {userInfo?.email && <span>{userInfo.email}</span>}
  </div>
));
UserExtra.displayName = 'UserExtra';

// Utility functions moved outside component to prevent recreation
const parseErrorMessage = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.error?.type === 'InvalidProviderAPIKey') {
      return {
        isApiKeyError: true,
        errorProvider: parsed.error.body?.provider || 'openai',
        actualMessage: parsed.content || content,
      };
    }
  } catch {
    // ignore JSON errors
  }
  return { isApiKeyError: false, errorProvider: 'openai', actualMessage: content };
};

const getMessageTimestamp = (createdAt: any): number => {
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === 'string') return new Date(createdAt).getTime();
  return Date.now();
};

const TeamChatMessages: React.FC<TeamChatMessagesProps> = memo(({ messages, isLoading }) => {
  const teamChatId = useTeamChatStore(useCallback((state) => state.activeTeamChatId, []));
  const { editMessage } = useTeamChatWebSocket({ teamChatId: teamChatId || '' });
  // ALL HOOKS AT THE TOP
  const userAvatar = useUserStore(userProfileSelectors.userAvatar);
  const currentUser = useUserStore(userProfileSelectors.userProfile);
  const theme = useTheme();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const lastMessageCountRef = useRef(messages?.length || 0);

  // Zustand store selectors with stability
  const isMessageEditing = useTeamChatStore(useCallback((state) => state.messageEditingIds, []));
  const toggleMessageEditing = useTeamChatStore(
    useCallback((state) => state.toggleMessageEditing, []),
  );

  const updateMessage = useTeamChatStore(useCallback((state) => state.updateMessage, []));
  const handleUpdateMessage = async (teamChatId: string, messageId: string, content: string) => {
    await updateMessage(teamChatId, messageId, content);
    await editMessage(messageId, content);
  };

  // Memoized processed messages for better performance
  const processedMessages = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return [];

    return messages
      .filter((msg) => msg && msg.id && (msg.content || msg.content === 'Thinking...'))
      .sort((a, b) => {
        const tsA = getMessageTimestamp(a.createdAt);
        const tsB = getMessageTimestamp(b.createdAt);
        return tsA !== tsB ? tsA - tsB : a.id.localeCompare(b.id);
      });
  }, [messages]);

  // Optimized scroll to bottom with debouncing
  const scrollToBottom = useCallback(() => {
    if (processedMessages.length > 0 && isAtBottom) {
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: processedMessages.length - 1,
          behavior: 'smooth',
          align: 'end',
        });
      });
    }
  }, [processedMessages.length, isAtBottom]);

  // Auto-scroll effect with optimization
  useEffect(() => {
    const currentCount = processedMessages.length;
    const previousCount = lastMessageCountRef.current;

    // Only scroll if new messages were added and user is at bottom
    if (currentCount > previousCount && isAtBottom) {
      scrollToBottom();
    }

    lastMessageCountRef.current = currentCount;
  }, [processedMessages.length, isAtBottom, scrollToBottom]);

  // Memoized avatar generator
  const getAvatar = useCallback(
    (message: TeamChatMessageItem) => {
      const isAssistant = message.messageType === 'assistant';
      if (isAssistant) {
        return { avatar: '🤖', title: 'AI Assistant' };
      }

      const userInfo = message.metadata?.userInfo;
      return {
        avatar: userInfo?.avatar || userAvatar || DEFAULT_USER_AVATAR,
        title: userInfo?.fullName || userInfo?.username || userInfo?.email || 'Unknown User',
      };
    },
    [userAvatar],
  );

  // Highly optimized message renderer
  const MessageRenderer = useCallback(
    ({ index }: { index: number }) => {
      const message = processedMessages[index];
      if (!message) return null;

      const isAssistant = message.messageType === 'assistant';
      const userInfo = message.metadata?.userInfo;
      const isCurrentUser = currentUser?.id === userInfo?.id;

      // Parse error and content
      let actualMessage = message.content;
      let isApiKeyError = false;
      let errorProvider = 'openai';

      if (isAssistant && message.content && message.content !== 'Thinking...') {
        const parsed = parseErrorMessage(message.content);
        isApiKeyError = parsed.isApiKeyError;
        errorProvider = parsed.errorProvider;
        actualMessage = parsed.actualMessage;
      }

      if (message.content === 'Thinking...') {
        actualMessage = '';
      }

      const avatar = getAvatar(message);
      const messageTime = getMessageTimestamp(message.createdAt);

      return (
        <div style={{ padding: '8px 16px' }}>
          {isApiKeyError ? (
            <APIKeyErrorMessage messageId={message.id} errorProvider={errorProvider} />
          ) : (
            <ChatItem
              style={{
                color: theme.appearance === 'dark' ? '#fefefe' : '#080808',
                borderRadius: 8,
                padding: 8,
              }}
              avatar={avatar}
              actions={<TeamChatActions id={message.id} index={index} />}
              editing={isMessageEditing.includes(message.id)}
              loading={message.content === 'Thinking...'}
              message={actualMessage || ''}
              placement={isAssistant ? 'left' : isCurrentUser ? 'right' : 'left'}
              primary={!isAssistant}
              time={messageTime}
              onChange={(value: string) =>
                handleUpdateMessage(message.teamChatId, message.id, value)
              }
              onEditingChange={(editing: boolean) => toggleMessageEditing(message.id, editing)}
              messageExtra={
                isAssistant ? (
                  <AssistantExtra metadata={message.metadata} theme={theme} />
                ) : userInfo ? (
                  <UserExtra
                    userInfo={userInfo}
                    files={message.metadata?.files || []}
                    theme={theme}
                  />
                ) : undefined
              }
              variant="bubble"
            />
          )}
        </div>
      );
    },
    [
      processedMessages,
      currentUser?.id,
      theme,
      isMessageEditing,
      getAvatar,
      toggleMessageEditing,
      updateMessage,
    ],
  );

  // Virtuoso callbacks for scroll management
  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  // Memoized components - Fix for few messages
  const components = useMemo(
    () => ({
      Footer: () => <div style={{ height: '16px' }} />,
      Header: () =>
        processedMessages.length <= 5 ? <div style={{ height: '20px', flexShrink: 0 }} /> : null,
    }),
    [processedMessages.length],
  );

  // CONDITIONAL RETURNS AFTER ALL HOOKS
  if (isLoading) {
    return <LoadingState />;
  }

  if (!processedMessages || processedMessages.length === 0) {
    return <TeamChatWelcome />;
  }

  // Determine Virtuoso configuration based on message count
  const shouldUseVirtualization = processedMessages.length > 10;
  const virtuosoProps = shouldUseVirtualization
    ? {
        followOutput: 'smooth' as const,
        alignToBottom: true,
        initialTopMostItemIndex: Math.max(0, processedMessages.length - 1),
        overscan: 10,
        increaseViewportBy: { top: 200, bottom: 200 },
      }
    : {
        // For few messages, don't use aggressive bottom alignment
        followOutput: false as const,
        alignToBottom: false,
        initialTopMostItemIndex: 0,
        overscan: 2,
      };

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
        data={processedMessages}
        itemContent={(index) => MessageRenderer({ index })}
        style={{
          height: '100%',
          minHeight: '500px',
          // Fix for few messages - prevent empty space at top
          ...(processedMessages.length <= 5 && {
            justifyContent: 'flex-start',
          }),
        }}
        components={components}
        atBottomStateChange={handleAtBottomStateChange}
        {...virtuosoProps}
        // Custom scroll behavior for few messages
        computeItemKey={(index) => processedMessages[index]?.id || index}
      />
    </div>
  );
});

TeamChatMessages.displayName = 'TeamChatMessages';

export default TeamChatMessages;
