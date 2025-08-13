import { DraggablePanel } from '@lobehub/ui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import Footer from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatInput/Desktop/Footer';
import { chainAnswerWithContext } from '@/chains/answerWithContext';
import { chainRewriteQuery } from '@/chains/rewriteQuery';
import { CHAT_TEXTAREA_HEIGHT } from '@/const/layoutTokens';
import { TeamChatMessageItem } from '@/database/schemas/teamChat';
import { ActionKeys } from '@/features/ChatInput/ActionBar/config';
import Head from '@/features/ChatInput/Desktop/Header';
import InputArea from '@/features/ChatInput/Desktop/InputArea';
import { useTeamChatRoute } from '@/hooks/useTeamChatRoute';
import { useTeamChatWebSocket } from '@/hooks/useTeamChatWebSocket';
import { chatService } from '@/services/chat';
import { getAgentStoreState, useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { fileChatSelectors, useFileStore } from '@/store/file';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { MessageRoleType } from '@/types/message';
import { ChatMessage, CreateMessageParams } from '@/types/message';
import { clientEncodeAsync } from '@/utils/tokenizer/client';
import { nanoid } from '@/utils/uuid';

const leftActions = [
  'model',
  'fileUpload',
  'knowledgeBase',
  'params',
  'stt',
  'tools',
] as ActionKeys[];

const rightActions = ['clear'] as ActionKeys[];

interface TeamChatInputProps {
  teamChatId: string;
  organizationId?: string; // For creating new chats when needed
}

// Maximum number of history messages to include in context
const MAX_HISTORY_MESSAGES = 20;

// Function to gather chat history and construct context
export const gatherChatHistory = async (
  teamChatId: string,
  maxMessages: number = MAX_HISTORY_MESSAGES,
): Promise<CreateMessageParams[]> => {
  const result: CreateMessageParams[] = [];

  // Get chat history from the store
  const teamChatStore = useTeamChatStore.getState();
  const chatHistory = teamChatStore.messages[teamChatId] || [];

  // Take the last maxMessages messages
  const recentHistory = chatHistory.slice(-maxMessages);

  // Add history messages with user context for multi-user chat
  recentHistory.forEach((msg) => {
    const userInfo = msg.metadata?.userInfo;
    let content = msg.content;

    // Add user context for non-assistant messages in multi-user chat
    if (msg.messageType === 'user' && userInfo && msg.metadata?.isMultiUserChat) {
      const userName = userInfo.fullName || userInfo.username || userInfo.email || 'Unknown User';
      content = `[${userName}]: ${msg.content}`;
    }

    result.push({
      role: msg.messageType as MessageRoleType,
      content: content,
      sessionId: teamChatId,
    });
  });

  return result;
};

const TeamChatInput = ({ teamChatId, organizationId }: TeamChatInputProps) => {
  // Get team chat store
  const teamChatStore = useTeamChatStore();
  const agentState = getAgentStoreState();
  const currentUser = useUserStore(userProfileSelectors.userProfile);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputHeight, updatePreference] = useGlobalStore((s) => [
    systemStatusSelectors.inputHeight(s),
    s.updateSystemStatus,
  ]);

  // Get team chat store methods and routing
  const {
    sendMessage: sendTeamMessage,
    createNewTeamChatWithTopic,
    activeTopicId,
  } = useTeamChatStore();

  // Use WebSocket for real-time messaging
  const {
    sendMessage: sendWebSocketMessage,
    startTyping,
    stopTyping,
  } = useTeamChatWebSocket({
    teamChatId,
    enabled: true,
  });

  // Handle input changes with typing indicators
  const handleInputChange = useCallback(
    (value: string) => {
      setInputMessage(value);

      // Send typing indicators via WebSocket
      if (value.length > 0) {
        startTyping();
      } else {
        stopTyping();
      }
    },
    [startTyping, stopTyping],
  );
  const { createNewTeamChat, switchToTeamChat } = useTeamChatRoute();

  // Get agent configuration for AI
  const agentConfig = useAgentStore(agentSelectors.currentAgentConfig);
  const agentChatConfig = useAgentStore(agentSelectors.currentAgentConfig);

  // Get file store for attachments
  const fileList = useFileStore(fileChatSelectors.chatUploadFileList);
  const clearChatUploadFileList = useFileStore((s) => s.clearChatUploadFileList);
  const isUploadingFiles = useFileStore(fileChatSelectors.isUploadingFiles);

  const handleSend = useCallback(async () => {
    const messageToSend = inputMessage.trim();
    const agentConfig = agentSelectors.currentAgentConfig(agentState);
    if (!messageToSend && fileList.length === 0) return;
    if (loading || isUploadingFiles) return;

    // Clear input immediately for better UX
    setInputMessage('');
    clearChatUploadFileList();
    setLoading(true);

    try {
      // Validate files before sending
      if (fileList.length > 0) {
        console.log('Validating files before sending:', fileList);
        fileList.forEach((file) => {
          if (!file.file.name) {
            throw new Error(`File is missing required name`);
          }
          if (!file.file.size) {
            throw new Error(`File ${file.file.name} is missing required size`);
          }
        });
      }

      const fileMetadata = fileList.map((file) => ({
        id: file.id,
        name: file.file.name,
        size: file.file.size,
        type: file.file.type || 'application/octet-stream',
        url: file.fileUrl || '',
      }));

      // Generate a consistent message ID that will be used by both client and server
      const consistentMessageId = `msg_${Date.now()}_${nanoid(10)}`;

      // Prepare user metadata for the message
      const userMetadata = currentUser
        ? {
            userInfo: {
              id: currentUser.id,
              username: currentUser.username,
              email: currentUser.email,
              fullName: currentUser.fullName,
              firstName: currentUser.firstName,
              avatar: currentUser.avatar,
            },
            files: fileMetadata, // <-- now included here
            isMultiUserChat: true,
            clientMessageId: consistentMessageId, // Pass the consistent ID
          }
        : { clientMessageId: consistentMessageId };

      // 1. Add user message to local store with the consistent ID
      const userMessageId = await teamChatStore.addMessage(teamChatId, {
        id: consistentMessageId, // Use the consistent ID
        content: messageToSend,
        messageType: 'user',
        userId: currentUser?.id || 'unknown',
        metadata: userMetadata,
        isLocal: false, // This will trigger database persistence
      });

      // 2. Send message via WebSocket with the consistent ID for real-time updates
      sendWebSocketMessage(messageToSend, 'user', userMetadata, consistentMessageId);
      console.log('User message sent successfully via WebSocket with ID:', consistentMessageId);

      // 3. Create a temporary assistant message for AI response
      const assistantMessageId = `assistant_${Date.now()}_${nanoid(10)}`;

      // Add the assistant message to local store with isLocal: true initially (temporary)
      await teamChatStore.addMessage(teamChatId, {
        id: assistantMessageId,
        content: 'Thinking...',
        messageType: 'assistant',
        userId: 'assistant',
        metadata: {
          isThinking: true,
          clientMessageId: assistantMessageId, // Add clientMessageId for consistency
        },
        isLocal: true, // Temporary until AI response is complete
      });

      // 4. Generate AI response
      try {
        const agentConfig = agentSelectors.currentAgentConfig(agentState);
        if (!agentConfig) {
          throw new Error('No agent configuration found');
        }

        // Gather chat history for context
        const chatHistory = await gatherChatHistory(teamChatId, MAX_HISTORY_MESSAGES);
        console.log('Gathered chat history for AI context:', chatHistory.length, 'messages');

        // Create messages array for AI service
        const messages: CreateMessageParams[] = [
          ...chatHistory,
          {
            role: 'user',
            content: messageToSend,
            sessionId: teamChatId,
          },
        ];

        // Add system role if configured
        if (agentConfig.systemRole) {
          messages.unshift({
            role: 'system',
            content: agentConfig.systemRole,
            sessionId: teamChatId,
          });
        }

        // Generate AI response
        let aiResponse = '';
        await chatService.createAssistantMessageStream({
          params: {
            messages: messages as any,
            model: agentConfig.model,
            provider: agentConfig.provider,
            ...agentConfig.params,
            plugins: agentConfig.plugins,
          },
          onMessageHandle: async (chunk) => {
            // Handle different chunk types
            switch (chunk.type) {
              case 'text': {
                aiResponse += chunk.text;
                // Update the assistant message in real-time for streaming effect
                await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
                  content: aiResponse,
                  metadata: {
                    isThinking: false,
                    clientMessageId: assistantMessageId, // Keep clientMessageId consistent
                  },
                });
                break;
              }
              case 'tool_calls': {
                console.log('Tool calls received:', chunk.tool_calls);
                break;
              }
              case 'reasoning': {
                console.log('Reasoning chunk:', chunk.text);
                break;
              }
              default: {
                if ('text' in chunk && chunk.text) {
                  aiResponse += chunk.text;
                  await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
                    content: aiResponse,
                    metadata: {
                      isThinking: false,
                      clientMessageId: assistantMessageId, // Keep clientMessageId consistent
                    },
                  });
                }
              }
            }
          },
          onFinish: async (finalContent, context) => {
            const finalMessage = finalContent || aiResponse || 'No response generated';

            // Extract usage information
            const metadata = context?.usage
              ? {
                  ...context.usage,
                  model: agentConfig.model,
                  provider: agentConfig.provider,
                  totalTokens: context.usage.totalTokens || 0,
                  clientMessageId: assistantMessageId, // Keep clientMessageId consistent
                }
              : {
                  model: agentConfig.model,
                  provider: agentConfig.provider,
                  clientMessageId: assistantMessageId, // Keep clientMessageId consistent
                };

            // Update the final message with the same ID to prevent duplication
            await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
              content: finalMessage,
              metadata: { ...metadata, isThinking: false, isLocal: false },
            });

            // Send AI message via WebSocket with the SAME ID for real-time updates to other team members
            // This ensures the message ID is consistent between client and server
            sendWebSocketMessage(
              finalMessage,
              'assistant',
              {
                ...metadata,
                clientMessageId: assistantMessageId, // Pass the consistent ID
              },
              assistantMessageId,
            );
            console.log('AI response sent via WebSocket with ID:', assistantMessageId);
          },
          onErrorHandle: async (error) => {
            console.error('AI generation error:', error);
            await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
              content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              metadata: {
                isError: true,
                isThinking: false,
                clientMessageId: assistantMessageId, // Keep clientMessageId consistent
              },
            });
          },
        });
      } catch (aiError) {
        console.error('Failed to generate AI response:', aiError);
        await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
          content: `Sorry, I encountered an error generating a response: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
          metadata: {
            isError: true,
            isThinking: false,
            clientMessageId: assistantMessageId, // Keep clientMessageId consistent
          },
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show detailed error message to user
      const errorMessageId = await teamChatStore.addMessage(teamChatId, {
        content: `Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        messageType: 'assistant',
        userId: 'assistant',
        metadata: { isError: true },
        isLocal: true,
      });
    } finally {
      setLoading(false);
    }
  }, [
    inputMessage,
    loading,
    isUploadingFiles,
    fileList,
    teamChatId,
    agentConfig,
    clearChatUploadFileList,
    teamChatStore,
    chatService,
    agentState,
    currentUser,
    sendWebSocketMessage,
  ]);

  return (
    <DraggablePanel
      minHeight={CHAT_TEXTAREA_HEIGHT}
      onSizeChange={(_, size) => {
        if (!size) return;
        const height = typeof size.height === 'string' ? Number.parseInt(size.height) : size.height;
        if (!height) return;
        updatePreference({ inputHeight: height });
      }}
      placement="bottom"
      size={{ height: inputHeight, width: '100%' }}
      style={{ zIndex: 10 }}
    >
      <Flexbox
        gap={8}
        height={'100%'}
        // paddingBlock={'4px 16px'}
        style={{ minHeight: CHAT_TEXTAREA_HEIGHT, position: 'relative' }}
      >
        <Head
          expand={false}
          leftActions={leftActions}
          rightActions={rightActions}
          setExpand={() => {}}
        />
        <InputArea
          loading={loading}
          onChange={handleInputChange}
          onSend={handleSend}
          value={inputMessage}
        />
        <Footer expand={false} onExpandChange={() => {}} />
      </Flexbox>
    </DraggablePanel>
  );
};

export default TeamChatInput;
