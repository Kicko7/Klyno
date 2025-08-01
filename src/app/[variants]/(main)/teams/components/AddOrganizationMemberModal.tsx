'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Select, message, Input } from 'antd';
import { UserPlus } from 'lucide-react';
import { lambdaClient } from '@/libs/trpc/client';

interface AddOrganizationMemberModalProps {
  open: boolean;
  onClose: () => void;
  organizationId?: string;
}

interface ExistingUser {
  id: string;
  name: string;
  email: string;
}

const AddOrganizationMemberModal = ({ open, onClose, organizationId }: AddOrganizationMemberModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [inviteMode, setInviteMode] = useState<'existing' | 'email'>('existing');
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchExistingUsers = async () => {
      if (!organizationId || !open) return;
      
      setLoadingUsers(true);
      try {
        // Get all organization members to exclude them from the selection
        const orgMembers = await lambdaClient.organization.getOrganizationMembers.query({
          organizationId
        });
        
        const orgMemberIds = orgMembers.map((member: any) => member.userId);
        
        // For now, we'll use mock data since we don't have a "getAllUsers" endpoint
        // In a real application, you would fetch all users from your user system
        const mockUsers: ExistingUser[] = [
          { id: 'user_1', name: 'John Doe', email: 'john@company.com' },
          { id: 'user_2', name: 'Jane Smith', email: 'jane@company.com' },
          { id: 'user_3', name: 'Mike Johnson', email: 'mike@company.com' },
          { id: 'user_4', name: 'Sarah Wilson', email: 'sarah@company.com' },
          { id: 'user_5', name: 'David Brown', email: 'david@company.com' },
        ];
        
        // Filter out users who are already organization members
        const availableUsers = mockUsers.filter(user => !orgMemberIds.includes(user.id));
        
        setExistingUsers(availableUsers);
      } catch (error) {
        console.error('Error fetching existing users:', error);
        // Fallback to mock data
        setExistingUsers([
          { id: 'user_1', name: 'John Doe', email: 'john@company.com' },
          { id: 'user_2', name: 'Jane Smith', email: 'jane@company.com' },
        ]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchExistingUsers();
  }, [organizationId, open]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      if (inviteMode === 'existing') {
        // Add existing user to organization
        await lambdaClient.organization.addExistingUserToOrganization.mutate({
          userId: values.userId,
          role: values.role,
          organizationId,
        });
        
        const selectedUser = existingUsers.find(user => user.id === values.userId);
        message.success(`${selectedUser?.name || 'User'} has been added to the organization successfully!`);
      } else {
        // Invite new user by email
        await lambdaClient.organization.inviteByEmail.mutate({
          email: values.email,
          role: values.role,
          organizationId,
        });
        
        message.success(`Invitation sent to ${values.email} successfully!`);
      }
      
      form.resetFields();
      onClose();
    } catch (error: any) {
      message.error(error?.message || 'Failed to add member to organization');
      console.error('Error adding organization member:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add Organization Member
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
          label="Invitation Method"
          name="inviteMode"
          initialValue="existing"
        >
          <Select 
            size="large" 
            onChange={(value) => setInviteMode(value)}
          >
            <Select.Option value="existing">Add Existing User</Select.Option>
            <Select.Option value="email">Invite by Email</Select.Option>
          </Select>
        </Form.Item>

        {inviteMode === 'existing' ? (
          <Form.Item
            label="Select User"
            name="userId"
            rules={[
              { required: true, message: 'Please select a user' }
            ]}
          >
            <Select 
              size="large" 
              placeholder="Select a user to add"
              loading={loadingUsers}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {existingUsers.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-sm text-gray-500">{user.email}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter an email address' },
              { type: 'email', message: 'Please enter a valid email address' }
            ]}
          >
            <Input 
              size="large" 
              placeholder="Enter email address"
              type="email"
            />
          </Form.Item>
        )}

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
            disabled={inviteMode === 'existing' && existingUsers.length === 0}
          >
            {inviteMode === 'existing' ? 'Add Member' : 'Send Invitation'}
          </Button>
        </div>
      </Form>
      
      {inviteMode === 'existing' && existingUsers.length === 0 && !loadingUsers && (
        <div className="text-center text-gray-500 py-4">
          No available users to add to this organization
        </div>
      )}
    </Modal>
  );
};

export default AddOrganizationMemberModal;
