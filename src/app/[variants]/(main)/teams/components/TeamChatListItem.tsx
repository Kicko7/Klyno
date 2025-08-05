import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import { List, Space, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { Globe2, Lock } from 'lucide-react';
import React, { useCallback } from 'react';

import { TeamChatItem } from '@/database/schemas/teamChat';
import { useTeamChatRoute } from '@/hooks/useTeamChatRoute';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';

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
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Text type="secondary" ellipsis>
              {teamChat.description || 'Team chat conversation'}
            </Text>
            <Space size={8}>
              {/* Access Status */}
              <Tooltip title={teamChat.metadata?.isPublic ? 'Public chat' : 'Private chat'}>
                <span>
                  {teamChat.metadata?.isPublic ? (
                    <Globe2 style={{ width: 14, height: 14, color: '#8c8c8c' }} />
                  ) : (
                    <Lock style={{ width: 14, height: 14, color: '#8c8c8c' }} />
                  )}
                </span>
              </Tooltip>

              {/* Member Count */}
              {teamChat.metadata?.memberAccess && teamChat.metadata.memberAccess.length > 0 && (
                <Tooltip title={`${teamChat.metadata.memberAccess.length} members`}>
                  <Space size={2}>
                    <UserOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {teamChat.metadata.memberAccess.length}
                    </Text>
                  </Space>
                </Tooltip>
              )}

              {/* Last Updated */}
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {teamChat.updatedAt ? dayjs(teamChat.updatedAt).fromNow() : ''}
              </Text>
            </Space>
          </Space>
        }
      />
    </List.Item>
  );
};

export default TeamChatListItem;
