'use client';

import { App, Button, Form, Input, Modal, Select, Spin, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useTeamStore } from '@/store/team';
import { useUserStore } from '@/store/user';

import TeamChatLayout from './TeamChatLayout';
import TeamChatInput from './components/TeamChatInput';
import TeamChatList from './components/TeamChatList';

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
    channels,
    currentChannel,
    currentTeam,
    loadingMembers,
    loadingMessages,
    loadingTeams,
    members,
    messages,
    setCurrentChannel,
    setCurrentTeam,
    teams,
    fetchMembers,
    fetchMessages,
    fetchTeams,
    inviteMember,
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
    // Only check for team if teams are loaded and not currently loading
    if (teams.length > 0 && !loadingTeams) {
      const team = teams.find((t) => t.id === teamId);
      if (team && team.id !== currentTeam?.id) {
        setCurrentTeam(team);
        fetchMembers(teamId);
      } else if (!team) {
        // Team not found, redirect back
        router.push('/teams');
      }
    }
  }, [teams, teamId, currentTeam, setCurrentTeam, loadingTeams, fetchMembers, router]);

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

  const handleSendMessage = async () => {
    if (!currentChannel) return;
    // await sendMessage(currentChannel.id, content, isAIChat);
  };

  const handleAddMember = async (values: { email: string; role: string }) => {
    setAddingMember(true);
    try {
      await inviteMember(teamId, values.email, values.role as 'admin' | 'member');
      message.success(
        `Invitation sent to ${values.email}. They'll be prompted to join when they sign in.`,
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

  // Show loading spinner while teams are loading or current team is not set
  if (loadingTeams || !currentTeam) {
    return (
      <Flexbox align="center" height="100vh" justify="center">
        <Spin size="large" />
      </Flexbox>
    );
  }

  return (
    <>
      <TeamChatLayout
        channels={channels}
        currentChannel={currentChannel}
        isAIMode={isAIMode}
        loadingMembers={loadingMembers}
        members={members}
        onAddMember={() => setShowAddMemberModal(true)}
        onBack={() => router.push('/teams')}
        onChannelSelect={setCurrentChannel}
        onToggleAIMode={() => setIsAIMode(!isAIMode)}
        teamName={currentTeam.name}
      >
        {currentChannel && (
          <Flexbox height="100%" style={{ position: 'relative' }}>
            {/* Chat Messages */}
            <TeamChatList isAIMode={isAIMode} loading={loadingMessages} messages={messages} />

            {/* Chat Input */}
            <TeamChatInput
              channelId={currentChannel.id}
              disabled={false}
              isAIMode={isAIMode}
              onSendMessage={handleSendMessage}
              placeholder={
                isAIMode
                  ? `Ask AI assistant in #${currentChannel.name}...`
                  : `Message #${currentChannel.name}`
              }
              teamId={teamId}
            />
          </Flexbox>
        )}
      </TeamChatLayout>

      <Modal
        onCancel={() => {
          setShowAddMemberModal(false);
          addMemberForm.resetFields();
        }}
        open={showAddMemberModal}
        title="Invite Team Member"
      >
        <Form form={addMemberForm} layout="vertical" onFinish={handleAddMember}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter an email address' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
          >
            <Input placeholder="user@example.com" type="email" />
          </Form.Item>

          <Form.Item
            initialValue="member"
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select>
              <Select.Option value="member">Member</Select.Option>
              <Select.Option value="moderator">Moderator</Select.Option>
              <Select.Option value="leader">Leader</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Text style={{ fontSize: 12 }} type="secondary">
              If the user already has an account, they&apos;ll be added to the team immediately. If
              not, the invitation will be saved and they&apos;ll be prompted to accept it when they
              sign up.
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
              <Button htmlType="submit" loading={addingMember} type="primary">
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
