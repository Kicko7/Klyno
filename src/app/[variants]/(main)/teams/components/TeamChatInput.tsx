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
  // Get chat history from the store
  const chatHistory = useTeamChatStore.getState().messages[teamChatId] || [];

  // Early return if no history
  if (chatHistory.length === 0) return [];

  // Take the last maxMessages messages and map them efficiently
  return chatHistory.slice(-maxMessages).map((msg) => {
    const { messageType, content, metadata } = msg;

    // Only process user context for multi-user chat
    if (messageType === 'user' && metadata?.isMultiUserChat && metadata?.userInfo) {
      const { userInfo } = metadata;
      const userName = userInfo.fullName || userInfo.username || userInfo.email || 'Unknown User';

      return {
        role: messageType as MessageRoleType,
        content: `[${userName}]: ${content}`,
        sessionId: teamChatId,
      };
    }

    // Return standard message format for non-user or non-multi-user messages
    return {
      role: messageType as MessageRoleType,
      content,
      sessionId: teamChatId,
    };
  });
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
      // if (value.length > 0) {
      //   startTyping();
      // } else {
      //   stopTyping();
      // }
    },
    [startTyping, stopTyping],
  );

  // Get agent configuration for AI
  const agentConfig = useAgentStore(agentSelectors.currentAgentConfig);

  // Get file store for attachments
  const fileList = useFileStore(fileChatSelectors.chatUploadFileList);
  const clearChatUploadFileList = useFileStore((s) => s.clearChatUploadFileList);
  const isUploadingFiles = useFileStore(fileChatSelectors.isUploadingFiles);

  const handleSend = async () => {
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
        validateFiles(fileList);
      }

      const fileMetadata = fileList.map((file) => ({
        id: file.id,
        name: file.file.name,
        size: file.file.size,
        type: file.file.type || 'application/octet-stream',
        url: file.fileUrl || '',
      }));

      // Generate consistent message IDs
      const userMessageId = `msg_${Date.now()}_${nanoid(10)}`;
      const assistantMessageId = `assistant_${Date.now()}_${nanoid(10)}`;

      // Prepare user metadata
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
            files: fileMetadata,
            isMultiUserChat: true,
            clientMessageId: userMessageId,
          }
        : { clientMessageId: userMessageId };

      // Add user message to local store
      await teamChatStore.addMessage(teamChatId, {
        id: userMessageId,
        content: messageToSend,
        messageType: 'user',
        userId: currentUser?.id || 'unknown',
        metadata: userMetadata,
        isLocal: true,
      });

     await sendWebSocketMessage(messageToSend, 'user', userMetadata, userMessageId);
      // Send message via WebSocket
      // console.log('Sending message to WebSocket');

      // Create temporary assistant message
      await teamChatStore.addMessage(teamChatId, {
        id: assistantMessageId,
        content: 'Thinking...',
        messageType: 'assistant',
        userId: currentUser?.id || 'unknown',
        metadata: { isThinking: true, clientMessageId: assistantMessageId, isLocal: true },
        isLocal: true,
      });

      // Generate AI response
      await generateAIResponse(messageToSend, teamChatId, assistantMessageId);
    } catch (error) {
      console.error('Failed to send message:', error);
      await showErrorMessage(error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const validateFiles = (files: any[]) => {
    files.forEach((file) => {
      if (!file.file.name) throw new Error('File is missing required name');
      if (!file.file.size) throw new Error(`File ${file.file.name} is missing required size`);
    });
  };

  const generateAIResponse = async (
    userMessage: string,
    teamChatId: string,
    assistantMessageId: string,
  ) => {
    try {
      const agentConfig = agentSelectors.currentAgentConfig(agentState);
      if (!agentConfig) throw new Error('No agent configuration found');

      const chatHistory = await gatherChatHistory(teamChatId, MAX_HISTORY_MESSAGES);
      const messages = buildMessageArray(chatHistory, userMessage, agentConfig);

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
          aiResponse = await handleAIChunk(chunk, aiResponse, teamChatId, assistantMessageId);
        },
        onFinish: async (finalContent, context) => {
          await finalizeAIMessage(
            finalContent,
            aiResponse,
            context,
            agentConfig,
            teamChatId,
            assistantMessageId,
          );
        },
        onErrorHandle: async (error) => {
          await handleAIError(error, teamChatId, assistantMessageId);
        },
      });
    } catch (error) {
      await handleAIError(error, teamChatId, assistantMessageId);
    }
  };

  const buildMessageArray = (
    chatHistory: CreateMessageParams[],
    userMessage: string,
    agentConfig: any,
  ) => {
    const messages = [
      ...chatHistory,
      { role: 'user', content: userMessage, sessionId: teamChatId },
    ];

    if (agentConfig.systemRole) {
      messages.unshift({ role: 'system', content: agentConfig.systemRole, sessionId: teamChatId });
    }

    return messages;
  };

  const handleAIChunk = async (
    chunk: any,
    aiResponse: string,
    teamChatId: string,
    assistantMessageId: string,
  ) => {
    if (chunk.type === 'text' || ('text' in chunk && chunk.text)) {
      const newResponse = aiResponse + (chunk.text || '');
      await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
        content: newResponse,
        metadata: { isThinking: false, clientMessageId: assistantMessageId },
      });
      return newResponse;
    }
    return aiResponse;
  };

  const finalizeAIMessage = async (
    finalContent: string,
    aiResponse: string,
    context: any,
    agentConfig: any,
    teamChatId: string,
    assistantMessageId: string,
  ) => {
    const finalMessage = finalContent || aiResponse || 'No response generated';
    const metadata = {
      ...context?.usage,
      model: agentConfig.model,
      provider: agentConfig.provider,
      totalTokens: context?.usage?.totalTokens || 0,
      clientMessageId: assistantMessageId,
    };

    await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
      content: finalMessage,
      metadata: { ...metadata, isThinking: false, isLocal: true },
    });

    sendWebSocketMessage(finalMessage, 'assistant', { isThinking: false, clientMessageId: assistantMessageId,userId:currentUser?.id || 'assistant' }, assistantMessageId);

  };

  const handleAIError = async (error: any, teamChatId: string, assistantMessageId: string) => {
    console.error('AI generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
      content: `Sorry, I encountered an error: ${errorMessage}`,
      metadata: { isError: true, isThinking: false, clientMessageId: assistantMessageId },
    });
  };

  const showErrorMessage = async (error: any) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await teamChatStore.addMessage(teamChatId, {
      content: `Sorry, I encountered an error processing your request: ${errorMessage}`,
      messageType: 'assistant',
      userId: 'assistant',
      metadata: { isError: true },
      isLocal: true,
    });
  };

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
