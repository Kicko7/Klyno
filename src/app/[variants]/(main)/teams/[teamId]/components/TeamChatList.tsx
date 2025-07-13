'use client';

import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';
import ChatItem from '@/features/ChatItem';
import { SkeletonList } from '@/features/Conversation';
import { TeamMessage } from '@/store/team/store';
import { RobotOutlined } from '@ant-design/icons';
import { useTheme } from 'antd-style';
import { Typography } from 'antd';

const { Text } = Typography;

interface TeamChatListProps {
  messages: TeamMessage[];
  loading: boolean;
  isAIMode: boolean;
}

const TeamChatList = memo<TeamChatListProps>(({ messages, loading, isAIMode }) => {
  const theme = useTheme();


  if (loading) {
    return <SkeletonList />;
  }

  if (messages.length === 0) {
    return (
      <Flexbox align="center" justify="center" style={{ height: '100%', padding: 24 }}>
        <div style={{ textAlign: 'center', color: theme.colorTextSecondary }}>
          {isAIMode 
            ? 'No messages yet. Start a conversation with the AI assistant!' 
            : 'No messages yet. Start the conversation!'}
        </div>
      </Flexbox>
    );
  }

  return (
    <Flexbox
      flex={1}
      style={{
        overflowY: 'auto',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {messages.map((message) => {
        const isAIMessage = message.metadata?.isAIChat || message.content.startsWith('AI Assistant:');
        const displayContent = isAIMessage && message.content.startsWith('AI Assistant: ') 
          ? message.content.substring(14) 
          : message.content;

        return (
          <ChatItem
            key={message.id}
            avatar={{
              avatar: isAIMessage ? <RobotOutlined /> : message.sender.avatar,
              title: isAIMessage ? 'AI Assistant' : (message.sender.fullName || message.sender.username || message.sender.email || 'Unknown'),
            }}
            content={displayContent}
            time={message.createdAt?.getTime()}
            placement={isAIMessage ? 'left' : 'right'}
            editing={false}
            loading={false}
            primary={!isAIMessage}
            renderMessage={() => (
              <Flexbox gap={4}>
                {isAIMessage && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    AI Response
                  </Text>
                )}
                <div>{displayContent}</div>
              </Flexbox>
            )}
          />
        );
      })}
    </Flexbox>
  );
});

TeamChatList.displayName = 'TeamChatList';

export default TeamChatList;
