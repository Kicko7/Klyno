'use client';

import { RobotOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { useTheme } from 'antd-style';
import { memo, useCallback, useState } from 'react';

import { ActionKeys } from '@/features/ChatInput/ActionBar/config';
import DesktopChatInput from '@/features/ChatInput/Desktop';
import InputArea from '@/features/ChatInput/Desktop/InputArea';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';

const { Text } = Typography;

interface TeamChatInputProps {
  channelId: string;
  teamId: string;
  isAIMode: boolean;
  onSendMessage: (content: string, isAIChat: boolean) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

const TeamChatInput = memo<TeamChatInputProps>(({ isAIMode, onSendMessage }) => {
  const theme = useTheme();
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  // Get AI agent configuration
  const agentConfig = useAgentStore(agentSelectors.currentAgentConfig);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || sending) return;

    setSending(true);
    try {
      // Send the message
      await onSendMessage(messageInput.trim(), isAIMode);
      setMessageInput('');

      if (isAIMode) {
        // In AI mode, we'll send a request to the AI service
        // For now, we'll simulate an AI response
        // TODO: Integrate with actual AI service
        setTimeout(async () => {
          const simulatedResponse = `I understand your request about "${messageInput.trim()}". This is a simulated AI response. In the production version, this will be replaced with actual AI-generated content based on your team's context and the configured AI model.`;
          await onSendMessage(`AI Assistant: ${simulatedResponse}`, true);
        }, 1000);
      }
    } finally {
      setSending(false);
    }
  }, [messageInput, sending, isAIMode, onSendMessage, agentConfig]);

  // Define actions for the chat input
  const leftActions: ActionKeys[] = isAIMode ? ['model'] : [];
  const rightActions: ActionKeys[] = ['clear'];

  const renderTextArea = useCallback(
    (onSend: () => void) => (
      <InputArea
        loading={sending}
        onChange={setMessageInput}
        onSend={() => {
          handleSendMessage();
          onSend();
        }}
        value={messageInput}
      />
    ),
    [messageInput, sending, handleSendMessage],
  );

  const renderFooter = useCallback(() => {
    if (!isAIMode) return null;
    return (
      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <RobotOutlined style={{ color: theme.colorPrimary }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          AI mode: Your messages will be processed by AI and responses will be visible to all team
          members.
        </Text>
      </div>
    );
  }, [isAIMode, theme]);

  return (
    <DesktopChatInput
      inputHeight={120}
      leftActions={leftActions}
      rightActions={rightActions}
      renderTextArea={renderTextArea}
      renderFooter={renderFooter}
    />
  );
});

TeamChatInput.displayName = 'TeamChatInput';

export default TeamChatInput;
