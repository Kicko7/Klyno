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
  organizationId?: string;
}

// Maximum number of history messages to include in context
const MAX_HISTORY_MESSAGES = 20;
const MAX_QUEUE_SIZE = 3;

// Function to gather chat history and construct context
export const gatherChatHistory = async (
  teamChatId: string,
  maxMessages: number = MAX_HISTORY_MESSAGES,
): Promise<CreateMessageParams[]> => {
  const chatHistory = useTeamChatStore.getState().messages[teamChatId] || [];
  if (chatHistory.length === 0) return [];

  return chatHistory.slice(-maxMessages).map((msg) => {
    const { messageType, content, metadata } = msg;

    if (messageType === 'user' && metadata?.isMultiUserChat && metadata?.userInfo) {
      const { userInfo } = metadata;
      const userName = userInfo.fullName || userInfo.username || userInfo.email || 'Unknown User';

      return {
        role: 'user',
        content: `[${userName}]: ${content}`,
        sessionId: teamChatId,
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

    return {
      role: 'assistant',
      content,
      sessionId: teamChatId,
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
  // Refs to prevent stale closure issues
  const currentUserRef = useRef<any>(null);
  const organizationSubscriptionInfoRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  // Store references
  const teamChatStore = useTeamChatStore();
  const currentUser = useUserStore(userProfileSelectors.userProfile);
  const { organizations, selectedOrganizationId } = useOrganizationStore();
  const { setOwnerId, ownerId, organizationSubscriptionInfo, updateOrganizationSubscriptionInfo ,updateTeamChatCredits} =
    useUserSubscription();

  // Component state
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Global state
  const [inputHeight, updatePreference] = useGlobalStore((s) => [
    systemStatusSelectors.inputHeight(s),
    s.updateSystemStatus,
  ]);

  // Team chat state
  const {
    queueItems,
    addToQueue,
    removeFromQueue,
    batchUpdateMessages,
    removeMessage,
    setSocketRef,
    removeQueueFromWebSocket,
    
  } = useTeamChatStore();
  const activeTeamChatId = useTeamChatStore((state) => state.activeTeamChatId);
  const setActiveChatState = useTeamChatStore((state) => state.setActiveChatState);
  const editWebSocketMessage = useTeamChatStore((state) => state.editWebSocketMessage);

  // File state
  const fileList = useFileStore(fileChatSelectors.chatUploadFileList);
  const clearChatUploadFileList = useFileStore((s) => s.clearChatUploadFileList);
  const isUploadingFiles = useFileStore(fileChatSelectors.isUploadingFiles);

  // Agent configuration
  const teamChatsByOrg = useTeamChatStore((state) => state.teamChatsByOrg);
  const teamChats = selectedOrganizationId ? teamChatsByOrg[selectedOrganizationId] || [] : [];
  const activeTeamChat = teamChats.find((chat) => chat.id === activeTeamChatId);
  const sessionId = activeTeamChat?.metadata?.sessionId;
  const agentConfigSession = useAgentStore(agentSelectors.getAgentConfigBySessionId(sessionId));

  // Model configuration
  const currentModel = agentConfigSession?.model || 'gpt-4';
  const currentProvider = agentConfigSession?.provider || 'openai';
  const modelSupportsVision = useModelSupportVision(currentModel, currentProvider);
  const canUpload = modelSupportsVision;

  // Organization setup
  const currentOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrganizationId),
    [organizations, selectedOrganizationId],
  );

  // Update refs to prevent stale closures
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    organizationSubscriptionInfoRef.current = organizationSubscriptionInfo;
  }, [organizationSubscriptionInfo]);

  useEffect(() => {
    if (currentOrganization && currentOrganization.ownerId !== ownerId) {
      setOwnerId(currentOrganization.ownerId);
    }
  }, [currentOrganization, ownerId, setOwnerId]);

  // Utility functions
  const validateFiles = useCallback((files: any[]) => {
    if (!files.length) return;

    for (const file of files) {
      if (!file?.file?.name) {
        throw new Error('File is missing required name');
      }
      if (!file?.file?.size) {
        throw new Error(`File ${file.file.name} is missing required size`);
      }
    }
  }, []);

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

  // WebSocket message sender
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
    [activeTeamChatId],
  );

  // Credit validation
  const validateCredits = useCallback(() => {
    const orgInfo = organizationSubscriptionInfoRef.current;

    if (!orgInfo || ['creator-pro', 'starter'].includes(orgInfo?.subscription?.planId)) {
      notification.error({
        message: 'Please upgrade to a team plan to continue using the team chat',
        description: 'Contact your administrator to upgrade your plan',
        duration: 0,
        icon: <FluentEmoji emoji={'🫡'} size={24} />,
      });
      const currentQueueItems = useTeamChatStore.getState().queueItems;
      if (currentQueueItems?.length > 0) {
        for (const item of currentQueueItems) {
          removeQueueFromWebSocket(teamChatId, item.messageId);
          removeFromQueue(item.messageId);
          setLoading(false);
        }
      }
      return false;
    }

    if (orgInfo?.currentCredits <= 0) {
      notification.error({
        message: 'You have no credits left',
        description: 'Please upgrade to a paid plan to continue using the chat',
        duration: 0,
        icon: <FluentEmoji emoji={'🫡'} size={24} />,
      });
      const currentQueueItems = useTeamChatStore.getState().queueItems;
      if (currentQueueItems?.length > 0) {
        for (const item of currentQueueItems) {
          removeQueueFromWebSocket(teamChatId, item.messageId);
          removeFromQueue(item.messageId);
          setLoading(false);
        }
      }
      return false;
    }

    return true;
  }, [teamChatId, removeQueueFromWebSocket, removeFromQueue]);

  // Queue message sender
  const sendMessageToQueueWebSocket = useCallback(
    (message: string) => {
      const currentUserData = currentUserRef.current;
      const currentTimestamp = Date.now();
      const userMessageId = `msg_${currentTimestamp}_${nanoid(10)}`;

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

      const userMetadata = currentUserData
        ? {
            userInfo: {
              id: currentUserData.id,
              username: currentUserData.username,
              email: currentUserData.email,
              fullName: currentUserData.fullName,
              firstName: currentUserData.firstName,
              avatar: currentUserData.avatar,
            },
            files: fileMetadata,
            isMultiUserChat: true,
            clientMessageId: userMessageId,
          }
        : { clientMessageId: userMessageId };

      const messageToSend = {
        id: userMessageId,
        content: message,
        type: 'user',
        metadata: userMetadata,
        messageId: userMessageId,
        timestamp: currentTimestamp,
      };

      socketRef.current?.emit('message:queue-send', {
        teamId: activeTeamChatId,
        content: message,
        type: 'user',
        metadata: userMetadata,
        messageId: userMessageId,
        timestamp: currentTimestamp,
      });

      addToQueue(messageToSend as any);
    },
    [fileList, activeTeamChatId, addToQueue],
  );

  // AI Response handlers
  const buildMessageArray = useCallback(
    (chatHistory: CreateMessageParams[], userMessage: string, agentConfig: any) => {
      const currentFileList =
        fileList.length > 0
          ? fileList.map((file) => ({
              id: file.id,
              name: file.file.name,
              size: file.file.size,
              type: file.file.type || 'application/octet-stream',
              url: file.fileUrl || '',
              content: '',
            }))
          : [];

      const currentImageList = currentFileList.filter((file) => file.type.startsWith('image'));
      const currentOtherFiles = currentFileList.filter((file) => !file.type.startsWith('image'));

      const messages = [
        ...chatHistory,
        {
          role: 'user',
          content: userMessage,
          sessionId: teamChatId,
          fileList: currentOtherFiles,
          imageList: currentImageList,
        },
      ];

      if (agentConfig?.systemRole) {
        messages.unshift({
          role: 'system',
          content: agentConfig.systemRole,
          sessionId: teamChatId,
        });
      }

      return messages;
    },
    [fileList, teamChatId],
  );

  const handleAIChunk = useCallback(
    async (chunk: any, aiResponse: string, teamChatId: string, assistantMessageId: string) => {
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
          if (chunk.images && chunk.images.length > 0) {
            const imageList = chunk.images.map((img: any) => ({
              id: img.id,
              url: img.data,
              alt: img.id,
            }));
          }
          break;
        }

        default: {
          if ('text' in chunk && chunk.text) {
            const newResponse = aiResponse + chunk.text;
            await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
              content: newResponse,
            });
            editWebSocketMessage(assistantMessageId, newResponse);
            return newResponse;
          }
        }
      }

      return aiResponse;
    },
    [teamChatStore, editWebSocketMessage],
  );

  const finalizeAIMessage = useCallback(
    async (
      finalContent: string,
      aiResponse: string,
      context: any,
      agentConfig: any,
      teamChatId: string,
      assistantMessageId: string,
    ) => {
      const finalMessage = finalContent || aiResponse || 'No response generated';

      // Get AI infrastructure state and model info for pricing
      const aiInfraStoreState = getAiInfraStoreState();
      const modelInfo = aiModelSelectors.getEnabledModelById(
        agentConfig.model,
        agentConfig.provider,
      )(aiInfraStoreState) as any;
      const agentPricing = modelInfo?.pricing as any;
  
      // Calculate credits if this is a paid model
      let creditsUsed = 0;
      if (
        context?.usage?.totalTokens &&
        !agentConfig.model.includes('free') &&
        agentConfig.provider == 'openrouter'
      ) {
        creditsUsed = calculateCreditsByPlan(
          context.usage as any,
          agentPricing as any,
          organizationSubscriptionInfo?.subscription?.planName || '',
        );
      }
  
      // Prepare metadata with credits information
      const baseMetadata = {
        ...context?.usage,
        model: agentConfig?.model,
        provider: agentConfig?.provider,
        totalTokens: context?.usage?.totalTokens || 0,
        clientMessageId: assistantMessageId,
        // Add credits information to metadata
        credits: {
          used: creditsUsed,
          planName: organizationSubscriptionInfo?.subscription?.planName,
          modelPricing: agentPricing,
        },
      };
  
      // Update the message with credits in metadata
      const message = await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
        content: finalMessage,
        metadata: { ...baseMetadata, isThinking: false, isLocal: true },
      });
  
      // Send via WebSocket with credits metadata
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
  
      // Update organization credits after successful message completion
      if (creditsUsed > 0) {
        const currentTotalbefore = useTeamChatStore.getState().chatCreditTotals[teamChatId] || 0;  
        useTeamChatStore.getState().setChatCreditTotal(teamChatId, currentTotalbefore + creditsUsed);
        await updateTeamChatCredits(teamChatId, creditsUsed);
        await updateOrganizationSubscriptionInfo(creditsUsed);
      }
    },
    [teamChatStore, sendWebSocketMessage, updateOrganizationSubscriptionInfo],
  );

  const handleAIError = useCallback(
    async (error: any, teamChatId: string, assistantMessageId: string) => {
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
    },
    [teamChatStore, sendWebSocketMessage],
  );

  const generateAIResponse = useCallback(
    async (userMessage: string, teamChatId: string, assistantMessageId: string) => {
      const orgInfo = organizationSubscriptionInfoRef.current;

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
            subscription: orgInfo,
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
          subscription: orgInfo,
        });
      } catch (error) {
        await handleAIError(error, teamChatId, assistantMessageId);
      }
    },
    [buildMessageArray, agentConfigSession, handleAIChunk, finalizeAIMessage, handleAIError],
  );

  // Message handlers
  const handleMessageUpdate = useCallback(
    (data: { id: string; content: string; metadata?: any }) => {
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
          const currentQueueItems = useTeamChatStore.getState().queueItems;
          const currentUserData = currentUserRef.current;

          if (
            currentQueueItems?.length > 0 &&
            currentQueueItems[0].metadata.userInfo.id === currentUserData?.id
          ) {
            handleSendQueue(currentQueueItems[0]);
            removeQueueFromWebSocket(teamChatId, currentQueueItems[0].messageId);
            removeFromQueue(currentQueueItems[0].messageId);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [teamChatId, batchUpdateMessages, removeQueueFromWebSocket, removeFromQueue],
  );

  const handleSendQueue = useCallback(
    async (message: any) => {
      if (!validateCredits()) return;

      try {
        const currentTimestamp = new Date();
        const assistantMessageId = `assistant_${currentTimestamp.getTime()}_${nanoid(10)}`;

        await teamChatStore.addMessage(teamChatId, {
          id: message.messageId,
          content: message.content,
          messageType: 'user',
          userId: message.metadata.userInfo.id,
          metadata: message.metadata,
          isLocal: true,
          sendTime: currentTimestamp,
        });

        await sendWebSocketMessage(
          message.content,
          'user',
          message.metadata,
          message.messageId,
          message.timestamp,
        );

        setTimeout(async () => {
          await teamChatStore.addMessage(teamChatId, {
            id: assistantMessageId,
            content: 'Thinking...',
            messageType: 'assistant',
            userId: currentUserRef.current?.id || 'unknown',
            metadata: { isThinking: true, clientMessageId: assistantMessageId, isLocal: true },
            isLocal: true,
            sendTime: currentTimestamp,
          });

          sendWebSocketMessage(
            'Thinking...',
            'assistant',
            { isThinking: true, clientMessageId: assistantMessageId, isLocal: true },
            assistantMessageId,
            new Date(),
          );
        }, 1000);

        await generateAIResponse(message.content, teamChatId, assistantMessageId);
      } catch (error) {
        console.error('Failed to send queue message:', error);
        await handleAIError(error, teamChatId, `error_${Date.now()}_${nanoid(10)}`);
      } finally {
        const currentQueueItems = useTeamChatStore.getState().queueItems;
        const currentUserData = currentUserRef.current;
        if (
          currentQueueItems?.length > 0 &&
          currentQueueItems[0].metadata.userInfo.id === currentUserData?.id
        ) {
          handleSendQueue(currentQueueItems[0]);
          removeQueueFromWebSocket(teamChatId, currentQueueItems[0].messageId);
          removeFromQueue(currentQueueItems[0].messageId);
        } else {
          setLoading(false);
        }
      }
    },
    [
      validateCredits,
      teamChatStore,
      teamChatId,
      sendWebSocketMessage,
      generateAIResponse,
      handleAIError,
    ],
  );

  const showErrorMessage = useCallback(
    async (error: any) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await teamChatStore.addMessage(teamChatId, {
        id: `error_${Date.now()}_${nanoid(10)}`,
        content: `Sorry, I encountered an error processing your request: ${errorMessage}`,
        messageType: 'assistant',
        userId: 'assistant',
        metadata: { isError: true },
      });
    },
    [teamChatStore, teamChatId],
  );

  // Main send handler
  const handleSend = useCallback(async () => {
    const messageToSend = inputMessage.trim();
    if (!messageToSend || isUploadingFiles) return;

    const currentQueueItems = useTeamChatStore.getState().queueItems;
    if (loading || currentQueueItems?.length > 0) {
      if (currentQueueItems?.length >= MAX_QUEUE_SIZE) {
        notification.error({
          message: 'Team Queue is full',
          description: 'Please wait for the queue to be empty',
          duration: 0,
          icon: <FluentEmoji emoji={'🫡'} size={24} />,
        });
        return;
      }
      sendMessageToQueueWebSocket(messageToSend);
      setInputMessage('');
      clearChatUploadFileList();
      return;
    }

    if (!validateCredits()) return;

    // Clear input immediately for better UX
    setInputMessage('');
    clearChatUploadFileList();
    setLoading(true);

    try {
      // Validate files
      if (fileList.length > 0) {
        validateFiles(fileList);

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

      // Prepare message data
      const currentTimestamp = Date.now();
      const userMessageId = `msg_${currentTimestamp}_${nanoid(10)}`;
      const assistantMessageId = `assistant_${currentTimestamp}_${nanoid(10)}`;
      const currentUserData = currentUserRef.current;

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

      const userMetadata = currentUserData
        ? {
            userInfo: {
              id: currentUserData.id,
              username: currentUserData.username,
              email: currentUserData.email,
              fullName: currentUserData.fullName,
              firstName: currentUserData.firstName,
              avatar: currentUserData.avatar,
            },
            files: fileMetadata,
            isMultiUserChat: true,
            clientMessageId: userMessageId,
          }
        : { clientMessageId: userMessageId };

      // Add user message
      const message = await teamChatStore.addMessage(teamChatId, {
        id: userMessageId,
        content: messageToSend,
        messageType: 'user',
        userId: currentUserData?.id || 'unknown',
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

      // Add thinking message
      setTimeout(async () => {
        await teamChatStore.addMessage(teamChatId, {
          id: assistantMessageId,
          content: 'Thinking...',
          messageType: 'assistant',
          userId: currentUserData?.id || 'unknown',
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
      // Process queue if available
      const currentQueueItems = useTeamChatStore.getState().queueItems;
      const currentUserData = currentUserRef.current;
      if (
        currentQueueItems?.length > 0 &&
        currentQueueItems[0].metadata.userInfo.id === currentUserData?.id
      ) {
        handleSendQueue(currentQueueItems[0]);
        removeQueueFromWebSocket(teamChatId, currentQueueItems[0].messageId);
        removeFromQueue(currentQueueItems[0].messageId);
      }
    }
  }, [
    inputMessage,
    isUploadingFiles,
    loading,
    validateCredits,
    sendMessageToQueueWebSocket,
    clearChatUploadFileList,
    fileList,
    validateFiles,
    canUpload,
    currentModel,
    teamChatStore,
    teamChatId,
    sendWebSocketMessage,
    generateAIResponse,
    showErrorMessage,
    handleSendQueue,
    removeQueueFromWebSocket,
    removeFromQueue,
  ]);

  const handleInputChange = useCallback((value: string) => {
    setInputMessage(value);
  }, []);

  // WebSocket setup effect
  useEffect(() => {
    if (!activeTeamChatId || !currentUser?.id) return;

    setTimeout(() => {
      setActiveChatState(true);
    }, 0);

    // Handle page unload/close
    const handleBeforeUnload = () => {
      if (socketRef.current?.connected) {
        socketRef.current?.emit('room:leave', activeTeamChatId);
        console.log(`🔌 Leaving room ${activeTeamChatId} on page unload`);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

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

    socketRef.current.on('message:update', handleMessageUpdate);

    socketRef.current.on(
      'message:queue',
      (data: {
        teamId: string;
        content: string;
        type?: any;
        metadata?: any;
        timestamp: any;
        messageId: string;
      }) => {
        console.log('message:queue', data);
        addToQueue(data as any);
      },
    );

    socketRef.current.on('message:queue:delete', (teamChatId: string, messageId: string) => {
      removeFromQueue(messageId);
    });

    socketRef.current.on('message:delete', (id: string) => {
      removeMessage(teamChatId, id);
    });

    socketRef.current.on('session:loaded', (session: any) => {
      setTimeout(() => {
        if (session?.messages && session.messages.length > 0) {
          batchUpdateMessages(teamChatId, session.messages, false);
        }
        console.log('session:loaded', session);
        if (session?.queue && session.queue.length > 0) {
          for (const message of session.queue) {
            addToQueue(message);
          }
        }
        setActiveChatState(false);
      }, 0);
    });

    socketRef.current.on('user:leave', (userId: string) => {
      handleUserLeave(userId);
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (socketRef.current?.connected) {
        socketRef.current?.emit('room:leave', activeTeamChatId);
      }
      socketRef.current?.disconnect();
      setSocketRef(null);
    };
  }, [
    activeTeamChatId,
    currentUser?.id,
    teamChatId,
    batchUpdateMessages,
    addToQueue,
    removeFromQueue,
    removeMessage,
    setSocketRef,
    setActiveChatState,
    isDuplicateMessage,
    handleMessageUpdate,
  ]);

  const handleUserLeave = useCallback(
    (userId: string) => {
      const currentQueueItems = useTeamChatStore.getState().queueItems;
      const userQueueItems = currentQueueItems?.filter(
        (item: any) => item.metadata.userInfo.id === userId,
      );
      for (const item of userQueueItems) {
        removeFromQueue(item.messageId);
      }
    },
    [removeFromQueue],
  );

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
        style={{ minHeight: CHAT_TEXTAREA_HEIGHT, position: 'relative' }}
      >
        <Head
          expand={false}
          leftActions={leftActions}
          rightActions={rightActions}
          setExpand={() => { }}
          sessionId={sessionId}
          teamChatId={teamChatId} // 👈 Pass it here
          organizationSubscriptionInfo={organizationSubscriptionInfo}
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
