'use client';

import { Avatar, List, Spin, Typography } from 'antd';
import { useTheme } from 'antd-style';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { TeamMessage } from '@/store/team/store';

const { Text } = Typography;

interface TeamMessageListProps {
  messages: TeamMessage[];
  loading: boolean;
  isAIMode: boolean;
}

const TeamMessageList = memo<TeamMessageListProps>(({ messages, loading, isAIMode }) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Flexbox align="center" justify="center" style={{ height: '100%' }}>
        <Spin />
      </Flexbox>
    );
  }

  if (messages.length === 0) {
    return (
      <Flexbox align="center" justify="center" style={{ height: '100%' }}>
        <Text type="secondary">
          {isAIMode
            ? 'No messages yet. Start a conversation with the AI assistant!'
            : 'No messages yet. Start the conversation!'}
        </Text>
      </Flexbox>
    );
  }

  return (
    <List
      dataSource={[...messages].reverse()}
      renderItem={(msg) => {
        const isAIMessage = msg.metadata?.isAIChat || msg.content.startsWith('AI Assistant:');
        const isAIResponse = msg.metadata?.isAIChat || msg.content.startsWith('AI Assistant:');

        return (
          <></>
          // <List.Item
          //   key={msg.id}
          //   style={{
          //     alignItems: 'flex-start',
          //     opacity: msg.isDeleted ? 0.5 : 1,
          //     background: isAIResponse ? theme.colorFillQuaternary : undefined,
          //     borderRadius: isAIResponse ? 8 : undefined,
          //     marginBottom: 8,
          //     padding: '12px 16px',
          //   }}
          // >
          //   <List.Item.Meta
          //     avatar={
          //       isAIMessage ? (
          //         <Avatar
          //           icon={<RobotOutlined />}
          //           style={{
          //             backgroundColor: theme.colorPrimary,
          //             color: theme.colorBgContainer
          //           }}
          //         />
          //       ) : (
          //         <Avatar
          //           src={msg.sender.avatar}
          //           icon={!msg.sender.avatar && <UserOutlined />}
          //         />
          //       )
          //     }
          //     title={
          //       <Flexbox gap={8} horizontal align="baseline">
          //         <Text strong>
          //           {isAIMessage
          //             ? 'AI Assistant'
          //             : msg.sender.fullName || msg.sender.username || msg.sender.email}
          //         </Text>
          //         <Text type="secondary" style={{ fontSize: 12 }}>
          //           {new Date(msg.createdAt).toLocaleString()}
          //         </Text>
          //         {msg.isEdited && (
          //           <Text type="secondary" style={{ fontSize: 12 }}>
          //             (edited)
          //           </Text>
          //         )}
          //         {isAIResponse && (
          //           <Text type="secondary" style={{ fontSize: 12, color: theme.colorPrimary }}>
          //             AI Response
          //           </Text>
          //         )}
          //       </Flexbox>
          //     }
          //     description={
          //       msg.isDeleted ? (
          //         <Text type="secondary" italic>
          //           This message was deleted
          //         </Text>
          //       ) : (
          //         <Text style={{ whiteSpace: 'pre-wrap' }}>
          //           {isAIMessage && msg.content.startsWith('AI Assistant: ')
          //             ? msg.content.substring(14)
          //             : msg.content}
          //         </Text>
          //       )
          //     }
          //   />
          // </List.Item>
        );
      }}
    />
  );
});

TeamMessageList.displayName = 'TeamMessageList';

export default TeamMessageList;
