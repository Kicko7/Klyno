'use client';

import { App, Button, Form, Input, Modal, Select, Spin, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Center } from 'react-layout-kit';
import { Flexbox } from 'react-layout-kit';

import { useTeamStore } from '@/store/team';
import { useUserStore } from '@/store/user';

import { InviteMember } from './components/InviteMember';

const { Text } = Typography;

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
      <Flexbox align="center" height="100vh" width="100vw" justify="center">
        <Button onClick={() => setShowAddMemberModal(true)}>Add Member</Button>
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
