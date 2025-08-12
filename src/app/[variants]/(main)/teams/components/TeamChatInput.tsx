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
const gatherChatHistory = async (
  teamChatId: string,
  currentMessage: string,
  messages: Record<string, TeamChatMessageItem[]>,
  agentConfig: any,
): Promise<CreateMessageParams[]> => {
  const result: CreateMessageParams[] = [];

  // Add system role if configured
  if (agentConfig.systemRole) {
    result.push({
      role: 'system',
      content: agentConfig.systemRole,
      sessionId: teamChatId,
    });
  }

  // Get chat history
  const chatHistory = messages[teamChatId] || [];

  // Take the last MAX_HISTORY_MESSAGES messages
  const recentHistory = chatHistory.slice(-MAX_HISTORY_MESSAGES);

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
          }
        : { files: fileMetadata };

      // 1. Add user message to UI immediately (non-blocking)
      // Send user message with user information
      sendTeamMessage(teamChatId, messageToSend, 'user', undefined, false, userMetadata);

      // Send message via WebSocket for real-time updates to all team members
      // This will handle both real-time broadcasting and database persistence
      sendWebSocketMessage(messageToSend, 'user', userMetadata);
      console.log('User message sent successfully via WebSocket');

      // 2. Create a temporary assistant message for AI response with empty content initially
      const assistantMessageId = nanoid();
      sendTeamMessage(teamChatId, '', 'assistant', assistantMessageId);
      console.log('Placeholder assistant message created:', assistantMessageId);

      // 3. Generate AI response using the chat service with history and RAG
      const sessionId = teamChatId;

      // Get chat history including system role if configured
      const messages = await gatherChatHistory(
        teamChatId,
        messageToSend,
        teamChatStore.messages,
        agentConfig,
      );

      // Add current user message
      const currentMessage: CreateMessageParams = {
        role: 'user',
        content: messageToSend,
        sessionId,
        files: fileList
          .map((f) => ({
            id: f.id,
            fileType: f.file.type || 'application/octet-stream',
            name: f.file.name,
            size: f.file.size,
            url: f.fileUrl || '',
          }))
          .filter(Boolean),
      };

      // Check if search/RAG is enabled and handle it
      const isSearchEnabled = agentConfig.plugins?.includes('search');
      if (isSearchEnabled) {
        try {
          // Get chat history for context
          const historyContext = messages.filter((m) => m.role !== 'system').map((m) => m.content);

          // Rewrite query for better semantic search
          // Create payload for query rewriting
          const rewritePayload = chainRewriteQuery(messageToSend, historyContext);

          // Get rewritten query
          const rewriteResponse = await chatService.createAssistantMessage({
            messages: rewritePayload.messages as ChatMessage[],
            model: agentConfig.model,
            provider: agentConfig.provider,
          });

          const rewrittenQuery = rewriteResponse.text || messageToSend;

          // Get relevant chunks from knowledge base
          // Use chat service to get search results
          const searchResponse = await chatService.createAssistantMessage({
            messages: [
              {
                role: 'user',
                content: String(rewrittenQuery),
                id: nanoid(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                meta: {},
              },
            ],
            model: agentConfig.model,
            provider: agentConfig.provider,
            enabledSearch: true,
          });

          if (searchResponse.text) {
            // Add search results as context
            currentMessage.content =
              `${messageToSend}\n\nRelevant context:\n${searchResponse.text}`.trim();
          }
        } catch (error) {
          console.error('Error processing RAG context:', error);
          // Continue without RAG if there's an error
        }
      }

      // Add the current message to the history
      messages.push(currentMessage);

      let aiResponse = '';

      // Stream AI response using proper streaming API
      await chatService.createAssistantMessageStream({
        params: {
          messages: messages as unknown as ChatMessage[],
          model: agentConfig.model,
          provider: agentConfig.provider,
          ...agentConfig.params,
          plugins: agentConfig.plugins,
        },
        onMessageHandle: (chunk) => {
          // Handle different chunk types like main chat
          switch (chunk.type) {
            case 'text': {
              aiResponse += chunk.text;
              // Update the assistant message in real-time for streaming effect
              sendTeamMessage(teamChatId, aiResponse, 'assistant', assistantMessageId);
              break;
            }
            case 'tool_calls': {
              // Handle tool calls if needed
              console.log('Tool calls received:', chunk.tool_calls);
              break;
            }
            case 'reasoning': {
              // Handle reasoning if needed
              console.log('Reasoning chunk:', chunk.text);
              break;
            }
            default: {
              // Handle other chunk types
              if ('text' in chunk && chunk.text) {
                aiResponse += chunk.text;
                sendTeamMessage(teamChatId, aiResponse, 'assistant', assistantMessageId);
              }
            }
          }
        },
        onFinish: async (finalContent, context) => {
          // Use accumulated response if no final content provided
          const finalMessage = finalContent || aiResponse || 'No response generated';

          // Extract usage information and include model/provider for proper display
          const metadata = context?.usage
            ? {
                ...context.usage,
                model: agentConfig.model,
                provider: agentConfig.provider,
                // Use the API's token count directly
                totalTokens: context.usage.totalTokens || 0,
              }
            : {
                model: agentConfig.model,
                provider: agentConfig.provider,
              };

          await sendTeamMessage(
            teamChatId,
            finalMessage,
            'assistant',
            assistantMessageId,
            false,
            metadata,
          );
        },
        onErrorHandle: (error) => {
          console.error('AI response error:', error);

          // Check if it's an API key error
          if (error?.type === 'InvalidProviderAPIKey') {
            // Create a special error message that will trigger the API key form
            const errorMessage = {
              id: assistantMessageId,
              content: 'API key configuration required',
              error: {
                type: 'InvalidProviderAPIKey',
                body: {
                  provider: agentConfig.provider || 'openai',
                },
              },
              messageType: 'assistant',
              metadata: {
                isError: true,
                errorType: 'InvalidProviderAPIKey',
                provider: agentConfig.provider || 'openai',
              },
            };

            // Store the error message in team chat for special handling
            sendTeamMessage(
              teamChatId,
              JSON.stringify(errorMessage),
              'assistant',
              assistantMessageId,
            );
          } else {
            sendTeamMessage(
              teamChatId,
              'Sorry, I encountered an error processing your request.',
              'assistant',
              assistantMessageId,
            );
          }
        },
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show detailed error message to user
      const errorMessageId = nanoid();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error sending message';
      await sendTeamMessage(
        teamChatId,
        `Sorry, I encountered an error processing your request: ${errorMessage}`,
        'assistant',
        errorMessageId,
      );
    } finally {
      setLoading(false);
    }
  }, [
    inputMessage,
    loading,
    isUploadingFiles,
    fileList,
    teamChatId,
    sendTeamMessage,
    agentConfig,
    clearChatUploadFileList,
    teamChatStore,
    chatService,
    agentState,
    currentUser,
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
