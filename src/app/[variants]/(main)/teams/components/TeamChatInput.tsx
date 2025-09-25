import { DraggablePanel, FluentEmoji } from '@lobehub/ui';
import { notification } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import { Socket, io } from 'socket.io-client';

import { CHAT_TEXTAREA_HEIGHT } from '@/const/layoutTokens';
import { ActionKeys } from '@/features/ChatInput/ActionBar/config';
import Head from '@/features/ChatInput/Desktop/Header';
import InputArea from '@/features/ChatInput/Desktop/InputArea';
import { useModelSupportVision } from '@/hooks/useModelSupportVision';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { chatService } from '@/services/chat';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { aiModelSelectors, getAiInfraStoreState, useAiInfraStore } from '@/store/aiInfra';
import { fileChatSelectors, useFileStore } from '@/store/file';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useOrganizationStore } from '@/store/organization/store';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { MessageRoleType } from '@/types/message';
import { CreateMessageParams } from '@/types/message';
import { MessageStreamData } from '@/types/redis';
import { calculateCreditsByPlan } from '@/utils/calculateCredits';
import { nanoid } from '@/utils/uuid';

import TeamChatInputFooter from './TeamChatInputFooter';

const leftActions = ['model', 'fileUpload', 'knowledgeBase', 'params', 'stt'] as ActionKeys[];

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
        role: 'user',
        content: `[${userName}]: ${content}`,
        sessionId: teamChatId,
        // Include file information if available
        fileList: metadata.files?.filter((f: any) => !f.type?.startsWith('image')) || [],
        imageList:
          metadata.files
            ?.filter((f: any) => f.type?.startsWith('image'))
            ?.map((f: any) => ({
              id: f.id,
              url: f.url,
              alt: f.name,
            })) || [],
      };
    }

    // Return standard message format for non-user or non-multi-user messages
    return {
      role: 'assistant',
      content,
      sessionId: teamChatId,
      // Include file information if available
      fileList: metadata?.files?.filter((f: any) => !f.type?.startsWith('image')) || [],
      imageList:
        metadata?.files
          ?.filter((f: any) => f.type?.startsWith('image'))
          ?.map((f: any) => ({
            id: f.id,
            url: f.url,
            alt: f.name,
          })) || [],
    };
  });
};

const TeamChatInput = ({ teamChatId }: TeamChatInputProps) => {
  // Get team chat store
  const teamChatStore = useTeamChatStore();
  const currentUser = useUserStore(userProfileSelectors.userProfile);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputHeight, updatePreference] = useGlobalStore((s) => [
    systemStatusSelectors.inputHeight(s),
    s.updateSystemStatus,
  ]);

  // Get team chat store methods and routing
  const { batchUpdateMessages, removeMessage, setSocketRef } = useTeamChatStore();

  const setActiveChatState = useTeamChatStore(useCallback((state) => state.setActiveChatState, []));

  const activeTeamChatId = useTeamChatStore((state) => state.activeTeamChatId);
  const editWebSocketMessage = useTeamChatStore(
    useCallback((state) => state.editWebSocketMessage, []),
  );
  const socketRef = useRef<Socket | null>(null);

  const isDuplicateMessage = useCallback((message: MessageStreamData, existingMessages: any[]) => {
    if (!message.id) return false;

    return existingMessages.some(
      (existing) =>
        existing.id === message.id ||
        (existing.content === message.content &&
          existing.userId === message.userId &&
          Math.abs(existing.createdAt.getTime() - new Date(message.timestamp).getTime()) < 1000),
    );
  }, []);

  useEffect(() => {
    if (!activeTeamChatId || !currentUser?.id) return;

    setTimeout(() => {
      setActiveChatState(true);
    }, 0);

    socketRef.current = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL, {
      auth: { userId: currentUser.id },
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 25000,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket:', socketRef.current?.id);
      setSocketRef(socketRef);
      socketRef.current?.emit('room:join', activeTeamChatId);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socketRef.current.on('message:new', (message: MessageStreamData) => {
      if (!message.id || message.teamId !== activeTeamChatId) return;

      const existingMessages = useTeamChatStore.getState().messages[message.teamId] || [];
      if (isDuplicateMessage(message, existingMessages)) return;

      console.log('message:new', message);
      if (message.userId === 'assistant') {
        setLoading(true);
      }
      const msg = {
        id: message.id,
        content: message.content,
        messageType:
          message.userId === 'assistant'
            ? 'assistant'
            : message.type === 'message'
              ? 'user'
              : (message.type as 'user' | 'assistant' | 'system'),
        teamChatId: message.teamId,
        userId: message.userId,
        metadata: message.metadata || {},
        createdAt: new Date(message.timestamp),
        updatedAt: new Date(),
        accessedAt: new Date(),
      };
      teamChatStore.addMessage(message.teamId, msg);
    });

    socketRef.current.on(
      'message:update',
      (data: { id: string; content: string; metadata?: any }) => {
        // console.log('message:update', data);
        const state = useTeamChatStore.getState();
        const existing = state.messages[teamChatId] || [];
        const idx = existing.findIndex((m) => m.id === data.id);
        if (idx !== -1) {
          const updated = {
            ...existing[idx],
            content: data.content,
            updatedAt: new Date(),
            metadata: data.metadata,
          };
          batchUpdateMessages(teamChatId, [updated as any]);
          if (data.metadata) {
            setLoading(false);
          }
        }
      },
    );

    socketRef.current.on('message:delete', (id: string) => {
      removeMessage(teamChatId, id);
    });

    socketRef.current.on('session:loaded', (session: any) => {
      setTimeout(() => {
        if (session?.messages && session.messages.length > 0) {
          batchUpdateMessages(teamChatId, session.messages, false);
        }
        setActiveChatState(false);
      }, 0);
    });

    return () => {
      socketRef.current?.emit('room:leave', teamChatId);
      socketRef.current?.disconnect();
      setSocketRef(null);
    };
  }, [activeTeamChatId, currentUser?.id]);

  const sendWebSocketMessage = useCallback(
    (
      content: string,
      type: 'user' | 'assistant' | 'system' = 'user',
      metadata?: any,
      messageId?: string,
      timestamp?: any,
    ) => {
      if (socketRef.current?.connected) {
        socketRef.current?.emit('message:send', {
          teamId: activeTeamChatId,
          content,
          type,
          metadata,
          messageId,
          timestamp,
        });
      }
    },
    [],
  );

  const handleInputChange = (value: string) => {
    setInputMessage(value);
  };

  // Get agent configuration for AI

  // Get file store for attachments
  const fileList = useFileStore(fileChatSelectors.chatUploadFileList);
  const clearChatUploadFileList = useFileStore((s) => s.clearChatUploadFileList);
  const isUploadingFiles = useFileStore(fileChatSelectors.isUploadingFiles);

  const { organizations, selectedOrganizationId } = useOrganizationStore();
  const currentOrganization = organizations.find((org) => org.id === selectedOrganizationId);

  const { setOwnerId, ownerId, organizationSubscriptionInfo, updateOrganizationSubscriptionInfo } =
    useUserSubscription();
  useEffect(() => {
    if (currentOrganization) {
      setOwnerId(currentOrganization.ownerId);
    }
  }, [currentOrganization, ownerId]);

  const teamChatsByOrg = useTeamChatStore((state) => state.teamChatsByOrg);

  const teamChats = selectedOrganizationId ? teamChatsByOrg[selectedOrganizationId] || [] : [];
  const activeTeamChat = teamChats.find((chat) => chat.id === activeTeamChatId);
  const sessionId = activeTeamChat?.metadata?.sessionId;
  const agentConfigSession = useAgentStore(agentSelectors.getAgentConfigBySessionId(sessionId));

  // Get current model and check if it supports vision (images)
  const currentModel = agentConfigSession?.model || 'gpt-4';
  const currentProvider = agentConfigSession?.provider || 'openai';
  const modelSupportsVision = useModelSupportVision(currentModel, currentProvider);

  // If model supports vision (images), allow all file uploads
  const canUpload = modelSupportsVision;

  const handleSend = async () => {
    const messageToSend = inputMessage.trim();
    if (!messageToSend) return;
    if (loading || isUploadingFiles) return;

    // Check if user has remaining credits
    if (
      !organizationSubscriptionInfo ||
      organizationSubscriptionInfo?.subscription?.planId == 'creator-pro' ||
      organizationSubscriptionInfo?.subscription?.planId == 'starter'
    ) {
      notification.error({
        message: 'Please upgrade to a team plan to continue using the team chat',
        description: 'Contact your administrator to upgrade your plan',
        duration: 0,
        icon: <FluentEmoji emoji={'🫡'} size={24} />,
      });
      return;
    }

    if (organizationSubscriptionInfo?.currentCredits <= 0) {
      notification.error({
        message: 'You have no credits left',
        description: 'Please upgrade to a paid plan to continue using the chat',
        duration: 0,
        icon: <FluentEmoji emoji={'🫡'} size={24} />,
      });
      return;
    }

    // Clear input immediately for better UX
    setInputMessage('');
    clearChatUploadFileList();
    setLoading(true);

    try {
      // Validate files before sending
      if (fileList.length > 0) {
        validateFiles(fileList);

        // Check if model supports file uploads or vision
        if (!canUpload) {
          notification.warning({
            message: `Model "${currentModel}" does not support file uploads`,
            description:
              'Please switch to a model that supports file uploads or remove the files before sending.',
            duration: 5,
            icon: <FluentEmoji emoji={'⚠️'} size={24} />,
          });
          setLoading(false);
          return;
        }
      }

      // Prepare file metadata efficiently
      const fileMetadata =
        fileList.length > 0
          ? fileList.map((file) => ({
              id: file.id,
              name: file.file.name,
              size: file.file.size,
              type: file.file.type || 'application/octet-stream',
              url: file.fileUrl || '',
            }))
          : [];

      // Generate consistent message IDs using a single timestamp
      const currentTimestamp = Date.now();
      const userMessageId = `msg_${currentTimestamp}_${nanoid(10)}`;
      const assistantMessageId = `assistant_${currentTimestamp}_${nanoid(10)}`;

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
      const message = await teamChatStore.addMessage(teamChatId, {
        id: userMessageId,
        content: messageToSend,
        messageType: 'user',
        userId: currentUser?.id || 'unknown',
        metadata: userMetadata,
        isLocal: true,
        sendTime: new Date(),
      });

      await sendWebSocketMessage(
        messageToSend,
        'user',
        userMetadata,
        userMessageId,
        message.sendTime,
      );
      // Send message via WebSocket
      // console.log('Sending message to WebSocket');

      // Create temporary assistant message
      setTimeout(async () => {
        await teamChatStore.addMessage(teamChatId, {
          id: assistantMessageId,
          content: 'Thinking...',
          messageType: 'assistant',
          userId: currentUser?.id || 'unknown',
          metadata: { isThinking: true, clientMessageId: assistantMessageId, isLocal: true },
          isLocal: true,
          sendTime: new Date(),
        });

        sendWebSocketMessage(
          'Thinking...',
          'assistant',
          { isThinking: true, clientMessageId: assistantMessageId, isLocal: true },
          assistantMessageId,
          new Date(),
        );
      }, 1000);

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
    if (!files.length) return;

    for (const file of files) {
      if (!file?.file?.name) {
        throw new Error('File is missing required name');
      }
      if (!file?.file?.size) {
        throw new Error(`File ${file.file.name} is missing required size`);
      }
    }
  };

  const generateAIResponse = async (
    userMessage: string,
    teamChatId: string,
    assistantMessageId: string,
  ) => {
    try {
      const chatHistory = await gatherChatHistory(teamChatId, MAX_HISTORY_MESSAGES);
      const messages = buildMessageArray(chatHistory, userMessage, agentConfigSession);

      let aiResponse = '';
      await chatService.createAssistantMessageStream({
        params: {
          messages: messages as any,
          model: agentConfigSession.model,
          provider: agentConfigSession.provider,
          ...agentConfigSession.params,
          plugins: agentConfigSession.plugins,
          subscription: organizationSubscriptionInfo,
        },
        onMessageHandle: async (chunk) => {
          aiResponse = await handleAIChunk(chunk, aiResponse, teamChatId, assistantMessageId);
        },
        onFinish: async (finalContent, context) => {
          await finalizeAIMessage(
            finalContent,
            aiResponse,
            context,
            agentConfigSession,
            teamChatId,
            assistantMessageId,
          );
        },
        onErrorHandle: async (error) => {
          await handleAIError(error, teamChatId, assistantMessageId);
        },
        subscription: organizationSubscriptionInfo,
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
    // Prepare file information for the current user message
    const currentFileList =
      fileList.length > 0
        ? fileList.map((file) => ({
            id: file.id,
            name: file.file.name,
            size: file.file.size,
            type: file.file.type || 'application/octet-stream',
            url: file.fileUrl || '',
            content: '', // Will be populated by the file processing system
          }))
        : [];

    // Separate images from other files
    const currentImageList = currentFileList.filter((file) => file.type.startsWith('image'));
    const currentOtherFiles = currentFileList.filter((file) => !file.type.startsWith('image'));

    const messages = [
      ...chatHistory,
      {
        role: 'user',
        content: userMessage,
        sessionId: teamChatId,
        // Add file information for vision models
        fileList: currentOtherFiles,
        imageList: currentImageList,
      },
    ];

    // Add system role at the beginning if it exists
    if (agentConfig?.systemRole) {
      messages.unshift({
        role: 'system',
        content: agentConfig.systemRole,
        sessionId: teamChatId,
      });
    }

    return messages;
  };

  const handleAIChunk = async (
    chunk: any,
    aiResponse: string,
    teamChatId: string,
    assistantMessageId: string,
  ) => {
    // Handle different chunk types like the main chat system
    switch (chunk.type) {
      case 'text': {
        const chunkText = chunk.text || '';
        if (chunkText) {
          const newResponse = aiResponse + chunkText;
          await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
            content: newResponse,
          });
          editWebSocketMessage(assistantMessageId, newResponse);
          return newResponse;
        }
        break;
      }

      case 'base64_image': {
        // Handle image generation responses
        if (chunk.images && chunk.images.length > 0) {
          const imageList = chunk.images.map((img: any) => ({
            id: img.id,
            url: img.data,
            alt: img.id,
          }));
        }
        break;
      }

      case 'tool_calls': {
        // Handle tool calls if needed
        break;
      }

      case 'reasoning': {
        // Handle reasoning if needed
        break;
      }

      default: {
        // Handle other chunk types
        if ('text' in chunk && chunk.text) {
          const newResponse = aiResponse + chunk.text;
          await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
            content: newResponse,
          });
          return newResponse;
        }
      }
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

    // Prepare metadata once to avoid duplication
    const baseMetadata = {
      ...context?.usage,
      model: agentConfig?.model,
      provider: agentConfig?.provider,
      totalTokens: context?.usage?.totalTokens || 0,
      clientMessageId: assistantMessageId,
    };

    const message = await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
      content: finalMessage,
      metadata: { ...baseMetadata, isThinking: false, isLocal: true },
    });
    // Send via WebSocket
    sendWebSocketMessage(
      finalMessage,
      'assistant',
      {
        ...baseMetadata,
        isThinking: false,
        userId: currentUser?.id || 'assistant',
      },
      assistantMessageId,
      message.sendTime,
    );

    const aiInfraStoreState = getAiInfraStoreState();
    const modelInfo = aiModelSelectors.getEnabledModelById(
      agentConfig.model,
      agentConfig.provider,
    )(aiInfraStoreState) as any;
    
    // If current agent is openrouter/auto, use claude-3.5-haiku pricing
    let agentPricing = modelInfo?.pricing as any;
    if (agentConfig.model === 'openrouter/auto' && agentConfig.provider === 'openrouter') {
      // Get claude-3.5-haiku pricing from OpenRouter
      const claudeModelInfo = aiModelSelectors.getEnabledModelById(
        'anthropic/claude-3.5-haiku',
        'openrouter',
      )(aiInfraStoreState) as any;
      agentPricing = claudeModelInfo?.pricing as any;
      console.log('Using claude-3.5-haiku pricing for openrouter/auto:', agentPricing);
    }

    if (
      context?.usage?.totalTokens &&
      !agentConfig.model.includes('free') &&
      agentConfig.provider == 'openrouter'
    ) {
      const credits = calculateCreditsByPlan(
        context.usage as any,
        agentPricing as any,
        organizationSubscriptionInfo?.subscription?.planName || '',
      );
      
      console.log('credits', credits);
      await updateOrganizationSubscriptionInfo(credits);
    }
  };

  const handleAIError = async (error: any, teamChatId: string, assistantMessageId: string) => {
    console.error('AI generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
      content: `Sorry, I encountered an error: ${errorMessage}`,
      metadata: { isError: true, isThinking: false, clientMessageId: assistantMessageId },
    });
    sendWebSocketMessage(
      `Sorry, I encountered an error: ${errorMessage}`,
      'assistant',
      { isError: true, isThinking: false, clientMessageId: assistantMessageId },
      assistantMessageId,
      new Date(),
    );
  };

  const showErrorMessage = async (error: any) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await teamChatStore.addMessage(teamChatId, {
      id: `error_${Date.now()}_${nanoid(10)}`,
      content: `Sorry, I encountered an error processing your request: ${errorMessage}`,
      messageType: 'assistant',
      userId: 'assistant',
      metadata: { isError: true },
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
          sessionId={sessionId}
        />
        <InputArea
          loading={loading}
          onChange={handleInputChange}
          onSend={handleSend}
          value={inputMessage}
        />
        <TeamChatInputFooter
          isLoading={loading}
          inputMessage={inputMessage}
          handleSend={handleSend}
          isUploadingFiles={isUploadingFiles}
        />
      </Flexbox>
    </DraggablePanel>
  );
};

export default TeamChatInput;
