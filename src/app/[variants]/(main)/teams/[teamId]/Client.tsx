'use client';

import { App, Avatar, Button, Form, Input, List, Modal, Select, Spin, Tag, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Center } from 'react-layout-kit';
import { Flexbox } from 'react-layout-kit';

import { useTeamStore } from '@/store/team';
import { useUserStore } from '@/store/user';

import { InviteMember } from './components/InviteMember';

const { Text, Title } = Typography;

interface TeamDetailClientProps {
  teamId: string;
}

const TeamDetailClient: React.FC<TeamDetailClientProps> = ({ teamId }) => {
  const router = useRouter();
  const { message } = App.useApp();
  const isSignedIn = useUserStore((s) => s.isSignedIn);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

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
    const loadTeamData = async () => {
      // Always fetch teams to ensure we have the latest data
      await fetchTeams();
    };

    loadTeamData();
  }, [teamId, isSignedIn, fetchTeams]);

  // Set current team and fetch members when teams are loaded
  useEffect(() => {
    if (teams.length > 0 && teamId) {
      const team = teams.find((t) => t.id === teamId);
      if (team) {
        setCurrentTeam(team);
        fetchMembers(teamId);
      }
    }
  }, [teams, teamId, setCurrentTeam, fetchMembers]);

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'red';
      case 'member':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      default:
        return role;
    }
  };

  // Show loading spinner while teams are loading or current team is not set
  if (loadingTeams) {
    return (
      <Flexbox align="center" height="100vh" width="100vw" justify="center">
        <Spin size="large" />
      </Flexbox>
    );
  }

  return (
    <>
      <Flexbox align="center" height="100vh" width="100vw" justify="center" gap={24}>
        <Button onClick={() => setShowAddMemberModal(true)}>Add Member</Button>

        {/* Team Members Section */}
        <Flexbox width="100%" gap={16}>
          <Title level={3}>Team Members</Title>

          {loadingMembers ? (
            <Center>
              <Spin size="large" />
            </Center>
          ) : (
            <List
              dataSource={members}
              renderItem={(member) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar>{member.userId.slice(0, 2).toUpperCase()}</Avatar>}
                    title={
                      <Flexbox horizontal gap={8} align="center">
                        <Text>{member.userId}</Text>
                        <Tag color={getRoleColor(member.role)}>
                          {getRoleDisplayName(member.role)}
                        </Tag>
                      </Flexbox>
                    }
                    description={
                      <Text type="secondary">
                        Joined{' '}
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString()
                          : 'Unknown'}
                      </Text>
                    }
                  />
                </List.Item>
              )}
              locale={{
                emptyText: currentTeam ? 'No members found' : 'Select a team to view members',
              }}
            />
          )}
        </Flexbox>
      </Flexbox>

      <InviteMember
        showAddMemberModal={showAddMemberModal}
        teamId={teamId}
        setShowAddMemberModal={setShowAddMemberModal}
      />
    </>
  );
};

export default TeamDetailClient;
