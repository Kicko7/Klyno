'use client';

import { Button, Modal, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { lambdaClient } from '@/libs/trpc/client';

const { Title, Text } = Typography;

interface InvitationDetails {
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

interface InvitationModalProps {
  onClose: () => void;
  open: boolean;
  token: string;
}

const InvitationModal: React.FC<InvitationModalProps> = ({ token, onClose, open }) => {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      const data = await lambdaClient.organization.getInvitationByToken.query({ token });

      if (!data) {
        throw new Error('Invitation not found or has expired');
      }

      // Transform the API response to match our interface
      const transformedInvitation: InvitationDetails = {
        id: data.id,
        teamId: data.teamId || '',
        role: data.role,
        teamName: data.team?.name || 'Unknown Team',
        organizationName: data.organization?.name || 'Unknown Organization',
        invitedBy: {
          id: data.invitedBy?.id || '',
          name: data.invitedBy?.user?.fullName || null,
          email: data.invitedBy?.user?.email || null,
        },
        expiresAt: data.expiresAt,
      };

      setInvitation(transformedInvitation);
    } catch (error: any) {
      console.error('Failed to fetch invitation:', error);
      // Handle error - could show an error message or redirect
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && token) {
      fetchInvitation();
    }
  }, [open, token]);

  const handleAccept = async () => {
    setProcessing(true);
    try {
      await lambdaClient.organization.acceptInvitation.mutate({ token });

      // Redirect to the team page
      if (invitation?.teamId) {
        router.push(`/teams/${invitation.teamId}`);
      } else {
        router.push('/teams');
      }
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      // Handle error
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      await lambdaClient.organization.declineInvitation.mutate({ token });
      onClose();
      router.push('/teams');
    } catch (error: any) {
      console.error('Failed to decline invitation:', error);
      // Handle error
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Modal open={open} title="Loading Invitation">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text>Loading invitation details...</Text>
        </div>
      </Modal>
    );
  }

  if (!invitation) {
    return (
      <Modal open={open} footer={null} title="Invalid Invitation">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text type="danger">This invitation is invalid or has expired.</Text>
          <br />
          <Button onClick={() => router.push('/teams')} style={{ marginTop: '16px' }}>
            Go to Teams
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} title="Team Invitation" footer={null} closable={false} width={500}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {invitation.teamName}
          </Title>
          <Text type="secondary">{invitation.organizationName}</Text>
        </div>

        <div>
          <Text>
            You have been invited by{' '}
            <strong>{invitation.invitedBy.name || invitation.invitedBy.email}</strong> to join as{' '}
            <strong>{invitation.role}</strong>
          </Text>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
          </Text>
        </div>

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleDecline} loading={processing} disabled={processing}>
            Decline
          </Button>
          <Button onClick={handleAccept} type="primary" disabled={processing} loading={processing}>
            Accept Invitation
          </Button>
        </Space>
      </Space>
    </Modal>
  );
};

export default InvitationModal;
