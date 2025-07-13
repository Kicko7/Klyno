import { useEffect, useState } from 'react';
import { Button, Card, message, Modal, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { lambdaClient } from '@/libs/trpc/client';

const { Title, Text } = Typography;

interface PendingInvitation {
  id: string;
  teamId: string;
  teamName: string;
  organizationName: string;
  role: string;
  invitedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  expiresAt: Date;
}

export const PendingInvitations = () => {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchInvitations = async () => {
    try {
      const data = await lambdaClient.organization.getPendingInvitations.query();
      setInvitations(data);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (invitationId: string, teamId: string) => {
    setProcessingId(invitationId);
    try {
      await lambdaClient.organization.acceptInvitation.mutate({ invitationId });
      message.success('Invitation accepted! Redirecting to team...');
      
      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
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
      await lambdaClient.organization.declineInvitation.mutate({ invitationId });
      message.info('Invitation declined');
      
      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (error: any) {
      message.error(error.message || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return null;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Modal
      title="Pending Team Invitations"
      open={true}
      footer={null}
      closable={false}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Text>
          You have been invited to join the following teams. Accept an invitation to start collaborating!
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
                  Invited by <strong>{invitation.invitedBy.name || invitation.invitedBy.email}</strong> as <strong>{invitation.role}</strong>
                </Text>
              </div>
              
              <Space>
                <Button
                  type="primary"
                  loading={processingId === invitation.id}
                  disabled={processingId !== null && processingId !== invitation.id}
                  onClick={() => handleAccept(invitation.id, invitation.teamId)}
                >
                  Accept
                </Button>
                <Button
                  loading={processingId === invitation.id}
                  disabled={processingId !== null && processingId !== invitation.id}
                  onClick={() => handleDecline(invitation.id)}
                >
                  Decline
                </Button>
              </Space>
            </Space>
          </Card>
        ))}
        
        <Button
          type="link"
          onClick={() => setInvitations([])}
          style={{ alignSelf: 'flex-end' }}
        >
          Decide later
        </Button>
      </Space>
    </Modal>
  );
};
