import { MessageOutlined } from '@ant-design/icons';
import { List, Typography } from 'antd';
import React, { useCallback } from 'react';

import { TeamChatItem } from '@/database/schemas/teamChat';
import { useTeamChatRoute } from '@/hooks/useTeamChatRoute';
import { useTeamChatStore } from '@/store/teamChat';

const { Text } = Typography;

interface TeamChatListItemProps {
  teamChat: TeamChatItem;
  teamId: string;
  isActive?: boolean;
}

const TeamChatListItem: React.FC<TeamChatListItemProps> = ({
  teamChat,
  teamId,
  isActive = false,
}) => {
  const { setActiveTeamChat } = useTeamChatStore();
  const { switchToTeamChat } = useTeamChatRoute();

  const handleClick = useCallback(() => {
    console.log('🔄 Switching to team chat:', teamChat.id);

    // Generate a topic ID for this chat if it doesn't have one
    const topicId = `topic_${teamChat.id}_${Date.now()}`;

    // Set active in store
    setActiveTeamChat(teamChat.id, topicId);

    // Navigate with chat ID and topic ID in URL
    switchToTeamChat(teamId, teamChat.id, topicId);

    console.log('✅ Switched to team chat:', { teamChatId: teamChat.id, topicId });
  }, [teamChat.id, teamId, setActiveTeamChat, switchToTeamChat]);

  return (
    <List.Item
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        backgroundColor: isActive ? '#f0f0f0' : 'transparent',
        borderRadius: '6px',
        margin: '4px 0',
        padding: '8px 12px',
        border: isActive ? '1px solid #d9d9d9' : '1px solid transparent',
      }}
      className="team-chat-list-item"
    >
      <List.Item.Meta
        avatar={<MessageOutlined style={{ color: '#1890ff' }} />}
        title={
          <Text strong={isActive} style={{ color: isActive ? '#1890ff' : undefined }}>
            {teamChat.title}
          </Text>
        }
        description={
          <Text type="secondary" ellipsis>
            {teamChat.description || 'Team chat conversation'}
          </Text>
        }
      />
    </List.Item>
  );
};

export default TeamChatListItem;
