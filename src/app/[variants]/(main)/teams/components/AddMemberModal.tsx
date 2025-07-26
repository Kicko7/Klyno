'use client';

import { useState } from 'react';
import { Modal, Input, Button, Form, Select, message } from 'antd';
import { UserPlus, Mail } from 'lucide-react';
import { organizationService } from '@/services/organization';
import { nanoid } from 'nanoid';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  organizationId?: string;
  teamId?: string;
}

const AddMemberModal = ({ open, onClose, organizationId, teamId }: AddMemberModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { email: string; role: 'admin' | 'member' }) => {
    try {
      setLoading(true);
      
      if (!organizationId || !teamId) {
        throw new Error('Organization ID and Team ID are required');
      }
      
      // Generate a unique token for the invitation
      const invitationToken = nanoid();
      
      // Call the organization service to invite a member
      await organizationService.addTeamMember({
        token: invitationToken,
        email: values.email,
        role: values.role,
        organizationId,
        teamId,
      });
      
      message.success(`Invitation sent to ${values.email}`);
      form.resetFields();
      onClose();
    } catch (error: any) {
      message.error(error?.message || 'Failed to send invitation');
      console.error('Error inviting member:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add Team Member
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        <Form.Item
          label="Email Address"
          name="email"
          rules={[
            { required: true, message: 'Please enter email address' },
            { type: 'email', message: 'Please enter a valid email address' }
          ]}
        >
          <Input
            prefix={<Mail className="w-4 h-4 text-gray-400" />}
            placeholder="Enter team member's email"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Role"
          name="role"
          initialValue="member"
          rules={[{ required: true, message: 'Please select a role' }]}
        >
          <Select size="large" placeholder="Select role">
            <Select.Option value="member">Member</Select.Option>
            <Select.Option value="admin">Admin</Select.Option>
          </Select>
        </Form.Item>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Send Invitation
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default AddMemberModal;
