import { ActionIconGroup, type ActionIconGroupEvent, type ActionIconGroupProps } from '@lobehub/ui';
import { App } from 'antd';
import isEqual from 'fast-deep-equal';
import { Check, Copy, Edit, Heart, RefreshCw, Trash } from 'lucide-react';
import { nanoid } from 'nanoid';
import { memo, use, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Socket } from 'socket.io-client';

import { TeamChatMessageItem } from '@/database/schemas/teamChat';
import { VirtuosoContext } from '@/features/Conversation/components/VirtualizedList/VirtuosoContext';
import { useTeamChatWebSocket } from '@/hooks/useTeamChatWebSocket';
import { chatService } from '@/services/chat';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/slices/message/selectors';
import { useTeamChatStore } from '@/store/teamChat';
import { MessageRoleType } from '@/types/message';

import { gatherChatHistory } from '../../components/TeamChatInput';

export type ActionsBarProps = ActionIconGroupProps;

const ActionsBar = memo<ActionsBarProps>((props) => {
  return <ActionIconGroup {...props} />;
});

ActionsBar.displayName = 'ActionsBar';

interface ActionsProps {
  id: string;
  inPortalThread?: boolean;
  index: number;
}

const Actions = memo<ActionsProps>(({ id, inPortalThread, index }) => {
  const item = useChatStore(chatSelectors.getMessageById(id), isEqual);
  const getMessageById = useTeamChatStore((state) => state.getMessageById);
  const removeMessage = useTeamChatStore((state) => state.removeMessage);
  const copyMessage = useTeamChatStore((state) => state.copyMessage);
  const toggleMessageEditing = useTeamChatStore((state) => state.toggleMessageEditing);
  const sendMessage = useTeamChatStore((state) => state.sendMessage);
  const agentConfig = useAgentStore(agentSelectors.currentAgentConfig);
  const agentState = useAgentStore();
  const teamChatStore = useTeamChatStore();

  const messageInfo: TeamChatMessageItem | undefined = useMemo(
    () => getMessageById(id),
    [getMessageById, id],
  );

  // Get WebSocket functions for real-time updates
  const {
    sendMessage: sendWebSocketMessage,
    startTyping,
    stopTyping,
    isConnected,
    deleteMessage: deleteWebSocketMessage,
  } = useTeamChatWebSocket({
    teamChatId: messageInfo?.teamChatId || '',
    enabled: !!messageInfo?.teamChatId,
  });

  // Socket reference for direct Redis events
  const socketRef = useRef<Socket | null>(null);

  const { t } = useTranslation('common');
  const { message } = App.useApp();
  const virtuosoRef = use(VirtuosoContext);

  const [showShareModal, setShareModal] = useState(false);

  // Helper function to send Redis events
  const sendRedisEvent = useCallback(
    (eventType: string, eventData: any) => {
      if (isConnected() && messageInfo?.teamChatId) {
        // For now, we'll use the WebSocket message function for Redis events
        // In a full implementation, you'd have a separate Redis event emitter
        console.log(`🔄 Redis Event: ${eventType}`, eventData);

        // Send via WebSocket for real-time sync
        // This would typically go to a Redis pub/sub system
        if (sendWebSocketMessage) {
          // Convert event to message format for WebSocket
          const redisMessage = `[REDIS_EVENT]${eventType}:${JSON.stringify(eventData)}`;
          sendWebSocketMessage(redisMessage, 'system');
        }
      }
    },
    [isConnected, messageInfo?.teamChatId, sendWebSocketMessage],
  );

  const handleActionClick = useCallback(
    async (action: ActionIconGroupEvent) => {
      if (!messageInfo) return;

      switch (action.key) {
        case 'edit': {
          // Toggle editing state locally
          toggleMessageEditing(id, true);

          // Send real-time typing indicator to all users
          startTyping();

          // Scroll to the message being edited
          virtuosoRef?.current?.scrollIntoView({ align: 'start', behavior: 'auto', index });

          // Stop typing after a delay
          setTimeout(() => stopTyping(), 3000);
          break;
        }
        case 'copy': {
          await copyMessage(messageInfo.content);
          message.success(t('copySuccess', { defaultValue: 'Copy Success' }));
          break;
        }
        case 'reaction': {
          // Send reaction to Redis for real-time sync across all users
          sendRedisEvent('message:reaction', {
            messageId: id,
            teamChatId: messageInfo.teamChatId,
            userId: messageInfo.userId,
            reaction: '👍', // Default reaction, could be made configurable
            timestamp: new Date().toISOString(),
          });
          break;
        }
        case 'read': {
          // Send read receipt to Redis for real-time sync
          sendRedisEvent('message:read', {
            messageId: id,
            teamChatId: messageInfo.teamChatId,
            userId: messageInfo.userId,
            timestamp: new Date().toISOString(),
          });
          break;
        }
        case 'branching': {
          // openThreadCreator(id);
          break;
        }
        case 'del': {
          console.log('Deleting message via Redis');

          // Remove message locally first for immediate UI feedback
          removeMessage(messageInfo.teamChatId, id);

          // Send delete action to Redis for real-time sync across all users
          deleteWebSocketMessage(id);
          sendRedisEvent('message:delete', {
            messageId: id,
            teamChatId: messageInfo.teamChatId,
            userId: messageInfo.userId,
            timestamp: new Date().toISOString(),
          });

          message.success(t('deleteSuccess', { defaultValue: 'Message deleted' }));
          break;
        }
        case 'regenerate': {
          const assistantMessageId = nanoid();

          // Create a placeholder assistant message locally
          sendMessage(messageInfo.teamChatId, '', 'assistant', assistantMessageId);

          // Send real-time typing indicator to all users
          startTyping();

          // Gather history including the original user message
          const agentConfig = agentSelectors.currentAgentConfig(agentState);
          const messages = await gatherChatHistory(messageInfo.teamChatId);

          // Add the original user message to the history
          const currentMessage: any = {
            role: 'user',
            content: messageInfo.content,
            sessionId: messageInfo.teamChatId,
            files: messageInfo.metadata?.files || [],
          };
          messages.push(currentMessage);

          let aiResponse = '';

          // Stream assistant response
          await chatService.createAssistantMessageStream({
            params: {
              messages: messages as any,
              model: agentConfig.model,
              provider: agentConfig.provider,
              ...agentConfig.params,
              plugins: agentConfig.plugins,
            },
            onMessageHandle: (chunk) => {
              if ('text' in chunk && chunk.text) {
                aiResponse += chunk.text;

                // Update message locally for streaming effect
                sendMessage(messageInfo.teamChatId, aiResponse, 'assistant', assistantMessageId);

                // Send real-time update to Redis for all users
                sendRedisEvent('message:update', {
                  messageId: assistantMessageId,
                  teamChatId: messageInfo.teamChatId,
                  content: aiResponse,
                  messageType: 'assistant',
                  userId: 'assistant',
                  timestamp: new Date().toISOString(),
                  isStreaming: true,
                });
              }
            },
            onFinish: async (finalContent, context) => {
              // Stop typing indicator
              stopTyping();

              // Update the final message with complete content
              sendMessage(messageInfo.teamChatId, finalContent, 'assistant', assistantMessageId);

              // Send final message to Redis for all users
              sendRedisEvent('message:complete', {
                messageId: assistantMessageId,
                teamChatId: messageInfo.teamChatId,
                content: finalContent,
                messageType: 'assistant',
                userId: 'assistant',
                timestamp: new Date().toISOString(),
                isStreaming: false,
                metadata: {
                  model: agentConfig.model,
                  provider: agentConfig.provider,
                  totalTokens: context?.usage?.totalTokens || 0,
                },
              });
            },
            onErrorHandle: (error) => {
              // Stop typing indicator on error
              stopTyping();

              console.error('AI regeneration error:', error);

              // Send error message to Redis for all users
              sendRedisEvent('message:error', {
                messageId: assistantMessageId,
                teamChatId: messageInfo.teamChatId,
                content: 'Failed to regenerate response',
                messageType: 'assistant',
                userId: 'assistant',
                timestamp: new Date().toISOString(),
                error: error.message,
              });
            },
          });
          break;
        }
      }
    },
    [
      messageInfo,
      id,
      index,
      toggleMessageEditing,
      virtuosoRef,
      copyMessage,
      message,
      t,
      removeMessage,
      sendMessage,
      agentState,
      chatService,
      startTyping,
      stopTyping,
      sendRedisEvent,
      deleteWebSocketMessage,
    ],
  );

  return (
    <ActionsBar
      items={[
        {
          icon: Copy,
          key: 'copy',
          label: t('copy', { defaultValue: 'Copy' }),
        },
        {
          icon: Edit,
          key: 'edit',
          label: t('edit', { defaultValue: 'Edit' }),
        },
        {
          icon: RefreshCw,
          key: 'regenerate',
          label: t('regenerate', { defaultValue: 'Regenerate' }),
        },
        {
          icon: Trash,
          key: 'del',
          label: t('delete', { defaultValue: 'Delete' }),
        },
        {
          icon: Heart,
          key: 'reaction',
          label: t('react', { defaultValue: 'React' }),
        },
        {
          icon: Check,
          key: 'read',
          label: t('markRead', { defaultValue: 'Mark Read' }),
        },
      ]}
      onActionClick={handleActionClick}
    />
  );
});

Actions.displayName = 'Actions';

export default Actions;
