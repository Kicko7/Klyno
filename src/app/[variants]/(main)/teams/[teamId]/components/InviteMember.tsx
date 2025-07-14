import { App, Button, Form, Input, Modal, Select, Spin, Typography, message } from 'antd';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import CopyableLabel from '@/components/CopyableLabel';
import { useTeamStore } from '@/store/team';

const { Text } = Typography;

export const InviteMember = ({
  showAddMemberModal,
  setShowAddMemberModal,
  teamId,
}: {
  showAddMemberModal: boolean;
  setShowAddMemberModal: (showAddMemberModal: boolean) => void;
  teamId: string;
}) => {
  const { inviteMember, teams } = useTeamStore();
  const { message } = App.useApp();
  const team = teams.find((team) => team.id === teamId);

  const joinLink = `${process.env.NEXT_PUBLIC_APP_URL}/join?joinCode=${team?.teamJoinCode}`;

  const [addingMember, setAddingMember] = useState(false);

  const [addMemberForm] = Form.useForm();
  const handleAddMember = async (values: { email: string; role: string }) => {
    setAddingMember(true);
    try {
      await inviteMember(
        teamId,
        values.email,
        values.role as 'admin' | 'member',
        team?.teamJoinCode || '',
      );
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

  return (
    <>
      <Modal
        open={showAddMemberModal}
        footer={null}
        width={500}
        centered={true}
        closeIcon={true}
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

          <Form.Item label="Team Join Link">
            <CopyableLabel value={joinLink} />
            <Text style={{ fontSize: 12 }} type="secondary">
              Share this link with team members to join directly.
            </Text>
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
