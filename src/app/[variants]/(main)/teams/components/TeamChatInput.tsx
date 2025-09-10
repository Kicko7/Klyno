import { DraggablePanel, FluentEmoji } from '@lobehub/ui';
import { notification } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { CHAT_TEXTAREA_HEIGHT } from '@/const/layoutTokens';
import { ActionKeys } from '@/features/ChatInput/ActionBar/config';
import Head from '@/features/ChatInput/Desktop/Header';
import InputArea from '@/features/ChatInput/Desktop/InputArea';
import { useTeamChatWebSocket } from '@/hooks/useTeamChatWebSocket';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { chatService } from '@/services/chat';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { fileChatSelectors, useFileStore } from '@/store/file';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useOrganizationStore } from '@/store/organization/store';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { MessageRoleType } from '@/types/message';
import { CreateMessageParams } from '@/types/message';
import { nanoid } from '@/utils/uuid';

import TeamChatInputFooter from './TeamChatInputFooter';
import { calculateCreditsByPlan } from '@/utils/calculateCredits';

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
      role: messageType as MessageRoleType,
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
  const { createNewTeamChatWithTopic, activeTopicId } = useTeamChatStore();

  const storeFunctions = useMemo(
    () => ({
      createNewTeamChatWithTopic,
      activeTopicId,
    }),
    [],
  );

  // Use WebSocket for real-time messaging
  const { sendMessage: sendWebSocketMessage } = useTeamChatWebSocket({
    teamChatId,
    enabled: true,
  });

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
  const activeTeamChatId = useTeamChatStore((state) => state.activeTeamChatId);
  const activeTeamChat = teamChats.find((chat) => chat.id === activeTeamChatId);
  const sessionId = activeTeamChat?.metadata?.sessionId;
  const agentConfigSession = useAgentStore(agentSelectors.getAgentConfigBySessionId(sessionId));

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
     const message =  await teamChatStore.addMessage(teamChatId, {
        id: userMessageId,
        content: messageToSend,
        messageType: 'user',
        userId: currentUser?.id || 'unknown',
        metadata: userMetadata,
        isLocal: true,
      });

      await sendWebSocketMessage(messageToSend, 'user', userMetadata, userMessageId,message.createdAt);
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
        });
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

   const message =  await teamChatStore.updateMessage(teamChatId, assistantMessageId, {
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
      message.createdAt,
    );

    // console.log('🔍 Context:', context);

    if (context?.usage?.totalTokens && !agentConfig.model.includes('free')) {
      const credits = calculateCreditsByPlan(context.usage as any,agentConfig.pricing as any,organizationSubscriptionInfo?.subscription?.planName || '');
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
