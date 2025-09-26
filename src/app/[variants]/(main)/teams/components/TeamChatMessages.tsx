import { useTheme } from 'antd-style';
import { Loader2, LoaderCircle } from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { DEFAULT_USER_AVATAR } from '@/const/meta';
import { TeamChatMessageItem } from '@/database/schemas/teamChat';
import ChatItem from '@/features/ChatItem';
import Usage from '@/features/Conversation/Extras/Usage';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { userGeneralSettingsSelectors } from '@/store/user/selectors';

import TeamChatActions from '../[teamId]/components/TeamChatActions';
import TeamAPIKeyForm from './TeamAPIKeyForm';
import TeamChatWelcome from './TeamChatWelcome';

interface TeamChatMessagesProps {
  messages: TeamChatMessageItem[];
  isLoading?: boolean;
  teamId?: string; // Add teamId for loading older messages
}

// Top loader component
const TopLoader = memo(() => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '16px',
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
    }}
  >
    <LoaderCircle className="animate-spin" size={20} />
    <span style={{ marginLeft: '8px', fontSize: '14px', color: '#6b7280' }}>
      Loading older messages...
    </span>
  </div>
));
TopLoader.displayName = 'TopLoader';

// Memoized components for better performance (keeping your existing ones)

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

// Keep your existing optimized components
const AssistantExtra = memo<{
  metadata: any;
  theme: any;
}>(({ metadata, theme }) => {
  if (metadata?.totalTokens) {
    return (
      <Usage
        metadata={metadata}
        model={metadata?.model === 'openrouter/auto' ? 'klynoai/auto' : metadata?.model || 'assistant'}
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
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'flex-start',
    }}
  >
    {Array.isArray(files) && files.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        {files.map((file, index) => {
          if (file.type?.startsWith('image/')) {
            return (
              <img
                key={`${file.id || index}`}
                src={file.url}
                alt={file.name}
                style={{
                  maxWidth: '200px',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  objectFit: 'contain',
                  border: `1px solid ${theme.colorBorder}`,
                }}
                loading="lazy"
              />
            );
          } else {
            return (
              <div
                key={`${file.id || index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: theme.colorFillTertiary,
                  borderRadius: '6px',
                  border: `1px solid ${theme.colorBorder}`,
                  maxWidth: '300px',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: theme.colorPrimary,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {file.type?.startsWith('application/pdf')
                    ? 'PDF'
                    : file.type?.startsWith('text/')
                      ? 'TXT'
                      : file.type?.startsWith('application/')
                        ? 'DOC'
                        : file.type?.startsWith('video/')
                          ? 'VID'
                          : file.type?.startsWith('audio/')
                            ? 'AUD'
                            : 'FILE'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: theme.colorText,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.colorTextSecondary }}>
                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    )}

    {userInfo?.email && (
      <div
        style={{
          fontSize: '11px',
          color: theme.colorTextTertiary,
          padding: '4px 8px',
          backgroundColor: theme.colorFillQuaternary,
          borderRadius: '4px',
          border: `1px solid ${theme.colorBorder}`,
        }}
      >
        👤 {userInfo.fullName || userInfo.username || userInfo.email}
      </div>
    )}
  </div>
));
UserExtra.displayName = 'UserExtra';

// Utility functions (keeping your existing ones)
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

const TeamChatMessages: React.FC<TeamChatMessagesProps> = memo(
  ({ messages, isLoading, teamId }) => {
    const LoadingState = memo(() => (
      <div className="flex-1 flex items-center justify-center">
        {/* <div>Loading messages...</div> */}
        <LoaderCircle
          className={`animate-spin ${theme.appearance === 'dark' ? 'text-white' : 'text-black'}`}
          size={50}
        />
      </div>
    ));

    const teamLoading = useTeamChatStore(useCallback((state) => state.teamLoading, []));
    const userAvatar = useUserStore(userProfileSelectors.userAvatar);
    const currentUser = useUserStore(userProfileSelectors.userProfile);
    const theme = useTheme();
    const transitionMode = useUserStore(userGeneralSettingsSelectors.transitionMode);
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const lastMessageCountRef = useRef(messages?.length || 0);

    // NEW STATE FOR INFINITE SCROLLING
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
    const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(true);
    const [page, setPage] = useState(1);
    const [shouldPreventAutoScroll, setShouldPreventAutoScroll] = useState(false);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [previousMessageCount, setPreviousMessageCount] = useState(0);

    // Keep your existing state
    const [generatingMessages, setGeneratingMessages] = useState<Set<string>>(new Set());
    const previousMessageContentRef = useRef<Record<string, string>>({});
    const lastMessageContentRef = useRef<string>('');
    const messageAnimationTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

    // Keep your existing store selectors
    const isMessageEditing = useTeamChatStore(useCallback((state) => state.messageEditingIds, []));
    const toggleMessageEditing = useTeamChatStore(
      useCallback((state) => state.toggleMessageEditing, []),
    );

    const updateMessageContent = useTeamChatStore(
      useCallback((state) => state.updateMessageContent, []),
    );

    const editWebSocketMessage = useTeamChatStore(
      useCallback((state) => state.editWebSocketMessage, []),
    );

    const handleUpdateMessage = async (teamChatId: string, messageId: string, content: string) => {
      updateMessageContent(teamChatId, messageId, content);
      editWebSocketMessage(messageId, content);
    };

    const loadMessages = useTeamChatStore(useCallback((state) => state.loadMessages, []));

    // FUNCTION TO LOAD OLDER MESSAGES
    const loadOlderMessages = useCallback(async () => {
      if (loadingOlderMessages === true || hasMoreOlderMessages === false || teamId === undefined) {
        return;
      }

      // Check if we have messages to work with
      if (!messages || messages.length === 0) {
        setHasMoreOlderMessages(false);
        return;
      }

      console.log('Loading older messages...');
      setLoadingOlderMessages(true);
      setIsLoadingOlder(true);
      // Don't prevent auto-scroll for new messages, only for maintaining position

      try {
        // Store current message count before loading
        setPreviousMessageCount(processedMessages.length);

        // Get the last (newest) message to load messages before it
        const lastMessage = messages[0];

        const res = await loadMessages(
          teamId as string,
          20,
          lastMessage?.id,
          lastMessage?.createdAt instanceof Date
            ? lastMessage?.createdAt.toISOString()
            : lastMessage?.createdAt,
        );

        console.log('Loaded older messages result:', {
          messagesCount: res.messages.length,
          hasMore: res.hasMore,
          totalCount: res.totalCount,
        });

        setHasMoreOlderMessages(res.hasMore);
      } catch (error) {
        console.error('Error loading older messages:', error);
      } finally {
        setLoadingOlderMessages(false);
        // Reset loading state after a short delay
        setTimeout(() => {
          setIsLoadingOlder(false);
        }, 500);
      }
    }, [loadingOlderMessages, teamId, messages, loadMessages]);

    // Keep your existing processedMessages logic
    const processedMessages = useMemo(() => {
      if (!messages || !Array.isArray(messages)) return [];

      return messages.filter(
        (msg) => msg && msg.id && (msg.content || msg.content === 'Thinking...'),
      );
    }, [messages]);

    // Effect to maintain scroll position when loading older messages
    useEffect(() => {
      if (isLoadingOlder && previousMessageCount > 0) {
        // Wait for the DOM to update with new messages
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (virtuosoRef.current) {
              const newMessageCount = processedMessages.length;
              const addedMessages = newMessageCount - previousMessageCount;
              
              if (addedMessages > 0) {
                // Scroll to the same relative position, accounting for new messages
                // We need to scroll to the index where the user was before
                virtuosoRef.current.scrollToIndex({
                  index: addedMessages,
                  align: 'start'
                });
              }
            }
          });
        });
      }
    }, [processedMessages.length, isLoadingOlder, previousMessageCount]);

    useEffect(() => {
      const newGeneratingMessages = new Set<string>();
      const currentContent = previousMessageContentRef.current;

      processedMessages.forEach((message) => {
        const messageId = message.id;
        const currentMessageContent = message.content || '';
        const previousContent = currentContent[messageId] || '';

        const isThinking = message.content === 'Thinking...';
        const isStreaming =
          message.messageType === 'assistant' &&
          currentMessageContent.length > previousContent.length &&
          !message.metadata?.isComplete &&
          !message.metadata?.finalMessage;
        const isNewlyGenerated =
          message.messageType === 'assistant' &&
          currentMessageContent.length > 0 &&
          !previousContent &&
          !message.metadata?.isComplete;

        const isUserBeingSent =
          message.messageType === 'user' && currentMessageContent.length > 0 && !previousContent;

        const isGenerating = isThinking || isStreaming || isNewlyGenerated || isUserBeingSent;

        if (isGenerating) {
          newGeneratingMessages.add(messageId);

          if (isUserBeingSent && !messageAnimationTimeouts.current[messageId]) {
            messageAnimationTimeouts.current[messageId] = setTimeout(() => {
              setGeneratingMessages((prev) => {
                const newSet = new Set(prev);
                newSet.delete(messageId);
                return newSet;
              });
              delete messageAnimationTimeouts.current[messageId];
            }, 800);
          }
        }

        currentContent[messageId] = currentMessageContent;
      });

      setGeneratingMessages((prev) => {
        const prevArray = Array.from(prev).sort();
        const newArray = Array.from(newGeneratingMessages).sort();
        if (
          prevArray.length !== newArray.length ||
          !prevArray.every((id, index) => id === newArray[index])
        ) {
          return newGeneratingMessages;
        }
        return prev;
      });
    }, [processedMessages]);

    // Keep your existing cleanup
    useEffect(() => {
      return () => {
        Object.values(messageAnimationTimeouts.current).forEach((timeout) => {
          clearTimeout(timeout);
        });
      };
    }, []);

    // Improved scroll functions
    const scrollToBottom = useCallback(
      (force = false) => {
        if (processedMessages.length > 0 && (isAtBottom || force)) {
          requestAnimationFrame(() => {
            virtuosoRef.current?.scrollToIndex({
              index: processedMessages.length - 1,
              behavior: 'smooth',
              align: 'end',
            });
          });
        }
      },
      [processedMessages.length, isAtBottom],
    );

    const scrollToBottomForStreaming = useCallback(
      (force = false) => {
        if (processedMessages.length > 0 && (isAtBottom || force)) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              virtuosoRef.current?.scrollToIndex({
                index: processedMessages.length - 1,
                behavior: 'smooth',
                align: 'end',
              });
            });
          });
        }
      },
      [processedMessages.length, isAtBottom],
    );

    // Improved scroll effects
    useEffect(() => {
      const currentCount = processedMessages.length;
      const previousCount = lastMessageCountRef.current;

      // Auto-scroll for new messages (when count increases)
      if (currentCount > previousCount && isAtBottom) {
        // Always auto-scroll for new messages, regardless of loading state
        scrollToBottom();
      }

      lastMessageCountRef.current = currentCount;
    }, [processedMessages.length, isAtBottom, scrollToBottom]);

    useEffect(() => {
      if (processedMessages.length > 0 && isAtBottom) {
        const lastMessage = processedMessages[processedMessages.length - 1];
        const currentLastContent = lastMessage?.content || '';

        // Force scroll for streaming content changes
        if (currentLastContent !== lastMessageContentRef.current && currentLastContent) {
          scrollToBottomForStreaming(true);
          lastMessageContentRef.current = currentLastContent;
        }
      }
    }, [processedMessages, isAtBottom, scrollToBottomForStreaming]);

    // Special effect for streaming messages - more aggressive scrolling
    useEffect(() => {
      if (processedMessages.length > 0) {
        const lastMessage = processedMessages[processedMessages.length - 1];
        const isStreaming =
          lastMessage?.messageType === 'assistant' &&
          lastMessage?.content &&
          lastMessage?.content !== 'Thinking...' &&
          !lastMessage?.metadata?.isLocal;

        if (isStreaming && isAtBottom) {
          // More aggressive scroll for streaming
          requestAnimationFrame(() => {
            virtuosoRef.current?.scrollToIndex({
              index: processedMessages.length - 1,
              behavior: 'smooth',
              align: 'end',
            });
          });
        }
      }
    }, [processedMessages, isAtBottom]);

    // Keep your existing getAvatar function
    const getAvatar = useCallback(
      (message: TeamChatMessageItem) => {
        const isAssistant =
          message.messageType === 'assistant' ||
          ('type' in message && message.type === 'assistant');
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

    // Keep your existing MessageRenderer
    const MessageRenderer = useCallback(
      ({ index }: { index: number }) => {
        const message = processedMessages[index];
        if (!message) return null;

        const isAssistant =
          message.messageType === 'assistant' ||
          ('type' in message && message.type === 'assistant');
        const userInfo = message.metadata?.userInfo;
        const isCurrentUser = currentUser?.id === userInfo?.id;

        const isGenerating = generatingMessages.has(message.id);
        const animated = transitionMode === 'fadeIn' && isGenerating;

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
          <div
            style={{
              padding: '8px 16px',
              transition: 'opacity 0.4s ease-in-out, transform 0.3s ease-out',
              transform: animated
                ? isAssistant
                  ? 'translateY(2px)'
                  : 'translateY(1px)'
                : 'translateY(0)',
            }}
          >
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
                markdownProps={{
                  animated,
                  variant: 'chat' as const,
                }}
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
        updateMessageContent,
        generatingMessages,
        transitionMode,
      ],
    );

    // Keep your existing scroll handlers
    const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
      setIsAtBottom(atBottom);
    }, []);

    // UPDATED: Handle scroll to top with infinite loading
    const handleRangeChanged = useCallback(
      (range: { startIndex: number; endIndex: number }) => {
        // If user scrolls to the very top and we're not already loading
        if (range.startIndex === 0 && hasMoreOlderMessages && !loadingOlderMessages && !isLoadingOlder) {
          console.log('User scrolled to top - triggering load older messages');
          loadOlderMessages();
        }
      },
      [hasMoreOlderMessages, loadingOlderMessages, isLoadingOlder, loadOlderMessages],
    );

    // UPDATED: Components with conditional top loader
    const components = useMemo(
      () => ({
        Footer: () => <div style={{ height: '16px' }} />,
        Header: () => {
          if ((loadingOlderMessages || isLoadingOlder) && hasMoreOlderMessages) {
            return <TopLoader />;
          }
          return processedMessages.length <= 5 ? (
            <div style={{ height: '20px', flexShrink: 0 }} />
          ) : null;
        },
      }),
      [processedMessages.length, loadingOlderMessages, isLoadingOlder, hasMoreOlderMessages],
    );

    // Keep your existing conditional returns
    if (teamLoading) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '500px',
          }}
        >
          <LoadingState />
        </div>
      );
    }

    if (!processedMessages || processedMessages.length === 0) {
      return <TeamChatWelcome />;
    }

    // Keep your existing Virtuoso configuration
    const shouldUseVirtualization = processedMessages.length > 10;
    const hasGeneratingMessages = generatingMessages.size > 0;

    const virtuosoProps = shouldUseVirtualization
      ? {
          followOutput: hasGeneratingMessages ? ('smooth' as const) : ('auto' as const),
          alignToBottom: true,
          initialTopMostItemIndex: Math.max(0, processedMessages.length - 1),
          overscan: 10,
          increaseViewportBy: { top: 200, bottom: 200 },
        }
      : {
          followOutput: hasGeneratingMessages ? ('smooth' as const) : (false as const),
          alignToBottom: hasGeneratingMessages,
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
            ...(processedMessages.length <= 5 && {
              justifyContent: 'flex-start',
            }),
          }}
          components={components}
          atBottomStateChange={handleAtBottomStateChange}
          rangeChanged={handleRangeChanged}
          {...virtuosoProps}
          computeItemKey={(index) => processedMessages[index]?.id || index}
        />
      </div>
    );
  },
);

TeamChatMessages.displayName = 'TeamChatMessages';

export default TeamChatMessages;
