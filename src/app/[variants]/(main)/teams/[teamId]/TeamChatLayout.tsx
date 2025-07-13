'use client';

import { Flexbox } from 'react-layout-kit';
import { memo } from 'react';
import { useTheme } from 'antd-style';
import { Button, Layout, Menu, Typography, Divider, List, Avatar } from 'antd';
import { MessageOutlined, PlusOutlined, UserOutlined, UserAddOutlined, TeamOutlined, RobotOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

interface TeamChatLayoutProps {
  teamName: string;
  currentChannel: any;
  channels: any[];
  members: any[];
  onChannelSelect: (channel: any) => void;
  onBack: () => void;
  onAddMember: () => void;
  loadingMembers: boolean;
  isAIMode: boolean;
  onToggleAIMode: () => void;
  children: React.ReactNode;
}

const TeamChatLayout = memo<TeamChatLayoutProps>(({
  teamName,
  currentChannel,
  channels,
  members,
  onChannelSelect,
  onBack,
  onAddMember,
  loadingMembers,
  isAIMode,
  onToggleAIMode,
  children,
}) => {
  const theme = useTheme();

  return (
    <Layout style={{ height: '100vh' }}>
      {/* Header */}
      <Header
        style={{
          background: theme.colorBgContainer,
          borderBottom: `1px solid ${theme.colorBorder}`,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}
      >
        <Flexbox align="center" gap={16} horizontal>
          <TeamOutlined style={{ fontSize: 24 }} />
          <Title level={4} style={{ margin: 0 }}>
            {teamName}
          </Title>
        </Flexbox>
        <Button onClick={onBack}>Back to Teams</Button>
      </Header>

      <Layout>
        {/* Sidebar */}
        <Sider
          width={280}
          style={{
            background: theme.colorBgContainer,
            borderRight: `1px solid ${theme.colorBorder}`,
          }}
        >
          {/* Channels Section */}
          <div style={{ padding: '16px' }}>
            <Flexbox justify="space-between" align="center" horizontal>
              <Text strong>Channels</Text>
              <Button type="text" icon={<PlusOutlined />} size="small" />
            </Flexbox>
          </div>
          <Menu
            mode="inline"
            selectedKeys={currentChannel ? [currentChannel.id] : []}
            style={{ border: 'none' }}
            items={channels.map((channel) => ({
              key: channel.id,
              icon: <MessageOutlined />,
              label: `# ${channel.name}`,
              onClick: () => onChannelSelect(channel),
            }))}
          />
          
          <Divider style={{ margin: '16px' }} />
          
          {/* Members Section */}
          <div style={{ padding: '16px' }}>
            <Flexbox justify="space-between" align="center" horizontal>
              <Text strong>Members ({members.length})</Text>
              <Button 
                type="text" 
                icon={<UserAddOutlined />} 
                size="small"
                onClick={onAddMember}
              />
            </Flexbox>
          </div>
          <List
            loading={loadingMembers}
            dataSource={members}
            renderItem={(member) => (
              <List.Item style={{ padding: '8px 16px' }}>
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={member.user.avatar}
                      icon={!member.user.avatar && <UserOutlined />}
                      size="small"
                    />
                  }
                  title={
                    <Text style={{ fontSize: 14 }}>
                      {member.user.fullName || member.user.username || member.user.email}
                    </Text>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {member.role}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </Sider>

        {/* Main Content */}
        <Content style={{ display: 'flex', flexDirection: 'column' }}>
          {currentChannel ? (
            <>
              {/* Channel Header */}
              <Header
                style={{
                  background: theme.colorBgContainer,
                  borderBottom: `1px solid ${theme.colorBorder}`,
                  padding: '0 24px',
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Flexbox gap={4}>
                  <Text strong style={{ fontSize: 18 }}>
                    # {currentChannel.name}
                  </Text>
                  {currentChannel.description && (
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      {currentChannel.description}
                    </Text>
                  )}
                </Flexbox>
                <Button
                  type={isAIMode ? "primary" : "default"}
                  icon={<RobotOutlined />}
                  onClick={onToggleAIMode}
                >
                  {isAIMode ? 'AI Mode' : 'Team Mode'}
                </Button>
              </Header>

              {/* Chat Content */}
              {children}
            </>
          ) : (
            <Flexbox align="center" justify="center" style={{ height: '100%' }}>
              <Text type="secondary">Select a channel to start chatting</Text>
            </Flexbox>
          )}
        </Content>
      </Layout>
    </Layout>
  );
});

TeamChatLayout.displayName = 'TeamChatLayout';

export default TeamChatLayout;
