'use client';

import { SignUp, useAuth } from '@clerk/nextjs';
import { Flex } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Team, useTeamStore } from '@/store/team/store';

const JoinOrganizationPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const joinCode = searchParams.get('joinCode') || searchParams.get('joinToken');
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const { getTeamByJoinCode, setCurrentTeam } = useTeamStore();

  useEffect(() => {
    const handleJoinFlow = async () => {
      if (isSignedIn && joinCode) {
        try {
          // User is already signed in, proceed to join team
          const team = await getTeamByJoinCode(joinCode);
          if (team) {
            setCurrentTeam(team);
            router.push(`/teams/${team.id}`);
          } else {
            // Invalid join code
            router.push('/?error=invalid_join_code');
          }
        } catch (error) {
          console.error('Error joining team:', error);
          router.push('/?error=join_failed');
        }
      }
    };

    handleJoinFlow();
  }, [isSignedIn, joinCode, getTeamByJoinCode, setCurrentTeam, router]);

  if (isSignedIn) {
    return (
      <Flex justify="center" align="center" style={{ height: '100vh', width: '100vw' }}>
        <div>Processing team invitation...</div>
      </Flex>
    );
  }

  return (
    <Flex justify="center" align="center" style={{ height: '100vh', width: '100vw' }}>
      <SignUp
        unsafeMetadata={{
          joinCode: joinCode || undefined,
        }}
        afterSignUpUrl={joinCode ? `/join?joinCode=${joinCode}` : '/'}
      />
    </Flex>
  );
};

export default JoinOrganizationPage;
