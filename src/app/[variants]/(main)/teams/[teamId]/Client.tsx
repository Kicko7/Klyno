'use client';

import { Modal, Form, Select, Spin, App, Button, Input, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import { useRouter } from 'next/navigation';

import { useTeamStore } from '@/store/team';
import { useUserStore } from '@/store/user';
import TeamChatLayout from './TeamChatLayout';
import TeamChatList from './components/TeamChatList';
import TeamChatInput from './components/TeamChatInput';

const { Text } = Typography;

interface TeamDetailClientProps {
  teamId: string;
}

const TeamDetailClient: React.FC<TeamDetailClientProps> = ({ teamId }) => {
  const router = useRouter();
  const { message } = App.useApp();
  const isSignedIn = useUserStore((s) => s.isSignedIn);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberForm] = Form.useForm();
  const [isAIMode, setIsAIMode] = useState(false);

  const {
    currentTeam,
    currentChannel,
    channels,
    members,
    messages,
    loadingChannels,
    loadingMessages,
    loadingMembers,
    setCurrentTeam,
    setCurrentChannel,
    fetchTeams,
    fetchMembers,
    fetchMessages,
    inviteMember,
    teams,
  } = useTeamStore();

  // Load team data
  useEffect(() => {
    if (!isSignedIn) {
      router.push('/teams');
      return;
    }

    const loadTeamData = async () => {
      // Always fetch teams to ensure we have the latest data
      await fetchTeams();
    };

    loadTeamData();
  }, [teamId, isSignedIn, fetchTeams]);

  // Set current team when teams are loaded
  useEffect(() => {
    if (teams.length > 0) {
      const team = teams.find((t) => t.id === teamId);
      if (team && team.id !== currentTeam?.id) {
        setCurrentTeam(team);
        fetchMembers(teamId);
      } else if (!team) {
        // Team not found, redirect back
        router.push('/teams');
      }
    }
  }, [teams, teamId, currentTeam, setCurrentTeam, , fetchMembers, router]);

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !currentChannel) {
      setCurrentChannel(channels[0]);
    }
  }, [channels, currentChannel, setCurrentChannel]);

  // Load messages when channel changes
  useEffect(() => {
    if (currentChannel) {
      fetchMessages(currentChannel.id);
    }
  }, [currentChannel, fetchMessages]);

  const handleSendMessage = async (content: string, isAIChat: boolean) => {
    if (!currentChannel) return;
    // await sendMessage(currentChannel.id, content, isAIChat);
  };


  const handleAddMember = async (values: { email: string; role: string }) => {
    setAddingMember(true);
    try {
      await inviteMember(teamId, values.email, values.role as 'admin' | 'member');
      message.success(
        `Invitation sent to ${values.email}. They'll be prompted to join when they sign in.`
      );
      setShowAddMemberModal(false);
      addMemberForm.resetFields();
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      // Check if it's the specific error about existing users
      if (error.message.includes('already a member')) {
        message.warning(error.message);
      } else {
        message.error(error.message || 'Failed to invite member. Please try again.');
      }
    } finally {
      setAddingMember(false);
    }
  };

  if (!currentTeam) {
    return (
      <Flexbox align="center" justify="center" height="100vh">
        <Spin size="large" />
      </Flexbox>
    );
  }

  return (
    <>
      <TeamChatLayout
        teamName={currentTeam.name}
        currentChannel={currentChannel}
        channels={channels}
        members={members}
        onChannelSelect={setCurrentChannel}
        onBack={() => router.push('/teams')}
        onAddMember={() => setShowAddMemberModal(true)}
        loadingMembers={loadingMembers}
        isAIMode={isAIMode}
        onToggleAIMode={() => setIsAIMode(!isAIMode)}
      >
        {currentChannel && (
          <Flexbox height="100%" style={{ position: 'relative' }}>
            {/* Chat Messages */}
            <TeamChatList
              messages={messages}
              loading={loadingMessages}
              isAIMode={isAIMode}
            />
            
            {/* Chat Input */}
            <TeamChatInput
              channelId={currentChannel.id}
              teamId={teamId}
              isAIMode={isAIMode}
              onSendMessage={handleSendMessage}
              placeholder={
                isAIMode 
                  ? `Ask AI assistant in #${currentChannel.name}...` 
                  : `Message #${currentChannel.name}`
              }
              disabled={false}
            />
          </Flexbox>
        )}
      </TeamChatLayout>
      
      <Modal
        title="Invite Team Member"
        open={showAddMemberModal}
        onCancel={() => {
          setShowAddMemberModal(false);
          addMemberForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={addMemberForm}
          layout="vertical"
          onFinish={handleAddMember}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter an email address' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
          >
            <Input type="email" placeholder="user@example.com" />
          </Form.Item>
          
          <Form.Item
            label="Role"
            name="role"
            initialValue="member"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select>
              <Select.Option value="member">Member</Select.Option>
              <Select.Option value="moderator">Moderator</Select.Option>
              <Select.Option value="leader">Leader</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Text type="secondary" style={{ fontSize: 12 }}>
              If the user already has an account, they'll be added to the team immediately. 
              If not, the invitation will be saved and they'll be prompted to accept it when they sign up.
            </Text>
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Flexbox gap={8} horizontal justify="flex-end">
              <Button
                onClick={() => {
                  setShowAddMemberModal(false);
                  addMemberForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={addingMember}>
                Invite Member
              </Button>
            </Flexbox>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TeamDetailClient;
