import { DraggablePanel } from '@lobehub/ui';
import React, { useCallback, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import Footer from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatInput/Desktop/Footer';
import { CHAT_TEXTAREA_HEIGHT } from '@/const/layoutTokens';
import { ActionKeys } from '@/features/ChatInput/ActionBar/config';
import Head from '@/features/ChatInput/Desktop/Header';
import InputArea from '@/features/ChatInput/Desktop/InputArea';
import { useTeamChatRoute } from '@/hooks/useTeamChatRoute';
import { chatService } from '@/services/chat';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { fileChatSelectors, useFileStore } from '@/store/file';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useTeamChatStore } from '@/store/teamChat';
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

const TeamChatInput = ({ teamChatId, organizationId }: TeamChatInputProps) => {
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

      console.log('Sending user message:', messageToSend);
      // 1. Add user message to UI immediately (non-blocking)
      // Send user message without token count - it will be included in the API's totalTokens
      sendTeamMessage(teamChatId, messageToSend, 'user');
      console.log('User message sent successfully');

      // 2. Create a temporary assistant message for AI response with empty content initially
      const assistantMessageId = nanoid();
      sendTeamMessage(teamChatId, '', 'assistant', assistantMessageId);
      console.log('Placeholder assistant message created:', assistantMessageId);

      // 3. Generate AI response using the chat service
      const sessionId = teamChatId; // Use team chat ID as session ID
      const messages: CreateMessageParams[] = [
        {
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
        },
      ];

      // Add system role if configured
      if (agentConfig.systemRole) {
        messages.unshift({
          role: 'system',
          content: agentConfig.systemRole,
          sessionId,
        });
      }

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
          onChange={(value) => setInputMessage(value)}
          onSend={handleSend}
          value={inputMessage}
        />
        <Footer expand={false} onExpandChange={() => {}} />
      </Flexbox>
    </DraggablePanel>
  );
};

export default TeamChatInput;
