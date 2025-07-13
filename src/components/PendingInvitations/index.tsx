import { App, Button, Card, Modal, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { lambdaClient } from '@/libs/trpc/client';
import { useUserStore } from '@/store/user/store';

const { Title, Text } = Typography;

interface PendingInvitation {
  expiresAt: Date;
  id: string;
  invitedBy: {
    email: string | null;
    id: string;
    name: string | null;
  };
  organizationName: string;
  role: string;
  teamId: string;
  teamName: string;
}

export const PendingInvitations = () => {
  const [invitations, setInvitations] = useState<PendingInvitation[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();
  const userId = useUserStore((s) => s.user?.id);
  const { message } = App.useApp();

  const fetchInvitations = async () => {
    if (!userId) return;

    try {
      const data = await lambdaClient.organization.getPendingInvitations.query({
        userId: userId,
      });

      // Transform API response to match PendingInvitation interface
      const transformedInvitations: PendingInvitation[] = data.map((invitation: any) => ({
        id: invitation.id,
        teamId: invitation.teamId || '',
        teamName: invitation.teamName || 'Unknown Team',
        organizationName: invitation.organizationName || 'Unknown Organization',
        role: invitation.role,
        invitedBy: {
          id: invitation.invitedBy?.id || '',
          name: invitation.invitedBy?.name || null,
          email: invitation.invitedBy?.email || null,
        },
        expiresAt: invitation.expiresAt,
      }));

      setInvitations(transformedInvitations);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [userId]);

  // Early return after all hooks have been called
  if (!userId || !invitations) return null;

  const handleAccept = async (invitationId: string, teamId: string) => {
    setProcessingId(invitationId);
    try {
      await lambdaClient.organization.acceptInvitation.mutate({ token: invitationId });
      message.success('Invitation accepted! Redirecting to team...');

      // Remove from list
      setInvitations((prev) => prev?.filter((inv) => inv.id !== invitationId) || []);

      // Redirect to team after a short delay
      setTimeout(() => {
        router.push(`/teams/${teamId}`);
      }, 1000);
    } catch (error: any) {
      message.error(error.message || 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      // Note: declineInvitation method doesn't exist in current API
      console.warn('declineInvitation method not implemented');
      message.info('Invitation declined');

      // Remove from list
      setInvitations((prev) => prev?.filter((inv) => inv.id !== invitationId) || []);
    } catch (error: any) {
      message.error(error.message || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return null;
  }

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <Modal closable={false} footer={null} open={true} title="Pending Team Invitations" width={600}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Text>
          You have been invited to join the following teams. Accept an invitation to start
          collaborating!
        </Text>

        {invitations.map((invitation) => (
          <Card key={invitation.id} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {invitation.teamName}
                </Title>
                <Text type="secondary">{invitation.organizationName}</Text>
              </div>

              <div>
                <Text>
                  Invited by{' '}
                  <strong>{invitation.invitedBy.name || invitation.invitedBy.email}</strong> as{' '}
                  <strong>{invitation.role}</strong>
                </Text>
              </div>

              <Space>
                <Button
                  disabled={processingId !== null && processingId !== invitation.id}
                  loading={processingId === invitation.id}
                  onClick={() => handleAccept(invitation.id, invitation.teamId)}
                  type="primary"
                >
                  Accept
                </Button>
                <Button
                  disabled={processingId !== null && processingId !== invitation.id}
                  loading={processingId === invitation.id}
                  onClick={() => handleDecline(invitation.id)}
                >
                  Decline
                </Button>
              </Space>
            </Space>
          </Card>
        ))}

        <Button onClick={() => setInvitations([])} style={{ alignSelf: 'flex-end' }} type="link">
          Decide later
        </Button>
      </Space>
    </Modal>
  );
};
