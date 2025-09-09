'use client';

import { useAuth } from '@clerk/nextjs';
import { SignUp } from '@clerk/nextjs';
import { App, Flex, Spin } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { lambdaClient } from '@/libs/trpc/client';
import { useOrganizationStore } from '@/store/organization/store';
import { useTeamStore } from '@/store/team/store';

const InvitePageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, userId } = useAuth();
  const { message } = App.useApp();
  const token = searchParams.get('token');
  const setSelectedOrganizationId = useOrganizationStore((s) => s.setSelectedOrganizationId);
  const fetchTeams = useTeamStore((s) => s.fetchTeams);

  useEffect(() => {
    const handleInvitation = async () => {
      if (!token) {
        message.error('Invalid invitation link');
        router.push('/teams');
        return;
      }

      if (isSignedIn && userId) {
        try {
          // Get invitation details
          const invitation = await lambdaClient.organization.getInvitationByToken.query({
            token,
          });

          if (!invitation) {
            message.error('Invalid or expired invitation');
            router.push('/teams');
            return;
          }

          // Accept invitation
          const result = await lambdaClient.organization.acceptInvitation.mutate({
            token,
          });

          if (!result) {
            throw new Error('Failed to accept invitation');
          }

          // Set the organization as active
          setSelectedOrganizationId(invitation.organizationId);

          // Fetch teams for the organization
          await fetchTeams();

          message.success('Successfully joined the organization!');

          // Redirect to teams page
          router.push('/teams');
        } catch (error: any) {
          console.error('Error accepting invitation:', error);
          message.error(error?.message || 'Failed to accept invitation');
          router.push('/teams');
        }
      }
    };

    handleInvitation();
  }, [isSignedIn, userId, token, router, message, setSelectedOrganizationId, fetchTeams]);

  if (isSignedIn) {
    return (
      <Flex justify="center" align="center" style={{ height: '100vh', width: '100vw' }}>
        <div style={{ textAlign: 'center' }}>
          <Spin spinning tip="Processing invitation...">
            {/* <div style={{ padding: 50 }}>Processing your invitation...</div> */}
          </Spin>
        </div>
      </Flex>
    );
  }

  return (
    <Flex justify="center" align="center" style={{ height: '100vh', width: '100vw' }}>
      <SignUp afterSignUpUrl={token ? `/teams/invite?token=${token}` : '/teams'} />
    </Flex>
  );
};

const InvitePage = () => {
  return (
    <App>
      <InvitePageContent />
    </App>
  );
};

export default InvitePage;
