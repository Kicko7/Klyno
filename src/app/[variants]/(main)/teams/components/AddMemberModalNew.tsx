'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Select, message } from 'antd';
import { UserPlus } from 'lucide-react';
import { lambdaClient } from '@/libs/trpc/client';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  organizationId?: string;
  teamId?: string;
}

interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
}

const AddMemberModal = ({ open, onClose, organizationId, teamId }: AddMemberModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchWorkspaceUsers = async () => {
      if (!organizationId || !open) return;
      
      setLoadingUsers(true);
      try {
        // Fetch users in the organization who are not already in this team
        const orgMembers = await lambdaClient.organization.getOrganizationMembers.query({
          organizationId
        });
        
        // Get current team members to exclude them from the selection
        const teamMembers = teamId ? await lambdaClient.organization.getTeamMembers.query({
          teamId
        }) : [];
        
        const teamMemberIds = teamMembers.map((member: any) => member.userId);
        
        // Filter out users who are already team members
        const availableUsers = orgMembers
          .filter((member: any) => !teamMemberIds.includes(member.userId))
          .map((member: any) => ({
            id: member.userId,
            name: member.name || member.email || 'Unknown User',
            email: member.email || ''
          }));
        
        setWorkspaceUsers(availableUsers);
      } catch (error) {
        console.error('Error fetching workspace users:', error);
        message.error('Failed to load workspace users');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchWorkspaceUsers();
  }, [organizationId, teamId, open]);

  const handleSubmit = async (values: { userId: string; role: 'admin' | 'member' }) => {
    try {
      setLoading(true);
      
      if (!organizationId || !teamId) {
        throw new Error('Organization ID and Team ID are required');
      }
      
      // Use the new endpoint to directly add existing user to team
      await lambdaClient.organization.inviteByUserId.mutate({
        userId: values.userId,
        role: values.role,
        organizationId,
        teamId,
      });
      
      const selectedUser = workspaceUsers.find(user => user.id === values.userId);
      message.success(`${selectedUser?.name || 'User'} has been added to the team successfully!`);
      form.resetFields();
      onClose();
    } catch (error: any) {
      message.error(error?.message || 'Failed to add user to team');
      console.error('Error adding member:', error);
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
          label="Select User from Workspace"
          name="userId"
          rules={[
            { required: true, message: 'Please select a user' }
          ]}
        >
          <Select 
            size="large" 
            placeholder="Select a user from your workspace"
            loading={loadingUsers}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {workspaceUsers.map(user => (
              <Select.Option key={user.id} value={user.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-sm text-gray-500">{user.email}</span>
                </div>
              </Select.Option>
            ))}
          </Select>
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
            disabled={workspaceUsers.length === 0}
          >
            Add to Team
          </Button>
        </div>
      </Form>
      
      {workspaceUsers.length === 0 && !loadingUsers && (
        <div className="text-center text-gray-500 py-4">
          No available users to add to this team
        </div>
      )}
    </Modal>
  );
};

export default AddMemberModal;
