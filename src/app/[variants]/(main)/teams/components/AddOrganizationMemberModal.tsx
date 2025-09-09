'use client';

import { App, Button, Form, Input, Modal, Select } from 'antd';
import { UserPlus } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEffect, useState } from 'react';

import { renderEmail } from '@/libs/emails/render-email';
import { OrganizationInvitation } from '@/libs/emails/templates/organization-invitation';
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

const AddOrganizationMemberModal = ({
  open,
  onClose,
  organizationId,
}: AddOrganizationMemberModalProps) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [inviteMode, setInviteMode] = useState<'existing' | 'email'>('email');
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<any>(null);

  // Reset form and mode when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      setInviteMode('email');
    }
  }, [open, form]);

  useEffect(() => {
    const fetchExistingUsers = async () => {
      if (!organizationId || !open) return;

      setLoadingUsers(true);
      try {
        // Get all organization members to show them in the existing users list
        const orgMembers = await lambdaClient.organization.getOrganizationMembers.query({
          organizationId,
        });

        console.log('Raw organization members from API:', orgMembers);

        // Transform organization members to existing users format
        const existingUsersList: ExistingUser[] = orgMembers.map((member: any) => ({
          id: member.userId,
          name: member.name || member.email || 'Unknown User',
          email: member.email,
        }));

        setExistingUsers(existingUsersList);
        console.log('Transformed existing organization members:', existingUsersList);
      } catch (error) {
        console.error('Error fetching existing users:', error);
        setExistingUsers([]);
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
        if (existingUsers.length === 0) {
          message.warning('No organization members available to add.');
          return;
        }

        // Check if the selected user is already a member
        const selectedUser = existingUsers.find((user) => user.id === values.userId.value);
        if (selectedUser) {
          message.warning(`${selectedUser.name} is already a member of this organization.`);
          setConfirmModalOpen(false);
          return;
        }

        // If we reach here, the user doesn't exist (shouldn't happen with current logic)
        message.error('Selected user not found in organization members.');
        setConfirmModalOpen(false);
        return;
      } else {
        // Check if the email is already a member of the organization
        const existingMember = existingUsers.find((user) => user.email === values.email);
        if (existingMember) {
          message.warning(`${values.email} is already a member of this organization.`);
          setConfirmModalOpen(false);
          return;
        }

        // Get organization info for the email
        const organization = await lambdaClient.organization.getOrganization.query({
          id: organizationId,
        });

        // Generate a unique token for the invitation
        const inviteToken = nanoid();

        // Generate email HTML on the client side
        const emailHtml = renderEmail(
          OrganizationInvitation({
            organizationName: organization?.name || 'Organization',
            inviteUrl: `${window.location.origin}/teams/invite?token=${inviteToken}`,
            teamName: '',
          }),
        );

        // Invite new user by email
        const result = await lambdaClient.organization.inviteByEmail.mutate({
          email: values.email,
          role: values.role,
          organizationId,
          html: emailHtml,
          token: inviteToken,
        });

        console.log('Invitation result:', result);
        message.success(`Invitation sent to ${values.email} successfully!`);
      }

      form.resetFields();
      setConfirmModalOpen(false);
      onClose();
    } catch (error: any) {
      console.error('Error adding organization member:', error);

      // Provide more specific error messages
      if (error?.message?.includes('already a member')) {
        message.warning(error.message);
      } else if (error?.message?.includes('not found')) {
        message.error('Organization not found. Please try again.');
      } else if (error?.message?.includes('permission')) {
        message.error('You do not have permission to perform this action.');
      } else {
        message.error(error?.message || 'Failed to add member to organization. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (values: any) => {
    // Check if user already exists before showing confirmation
    if (inviteMode === 'email') {
      const existingMember = existingUsers.find((user) => user.email === values.email);
      if (existingMember) {
        message.warning(`${values.email} is already a member of this organization.`);
        return;
      }
    } else if (inviteMode === 'existing') {
      const selectedUser = existingUsers.find((user) => user.id === values.userId.value);
      if (selectedUser) {
        message.warning(`${selectedUser.name} is already a member of this organization.`);
        return;
      }
    }

    setFormValues(values);
    setConfirmModalOpen(true);
  };

  const handleConfirmOk = () => {
    if (formValues) {
      handleSubmit(formValues);
    }
  };

  const handleConfirmCancel = () => {
    setConfirmModalOpen(false);
    setFormValues(null);
  };

  return (
    <>
      {/* Main Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Member to Organization
          </div>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        width={500}
        centered
        destroyOnClose
        maskClosable={false}
        style={{
          top: 0,
        }}
        bodyStyle={{
          padding: '24px',
        }}
      >
        <div className="mb-4 text-sm text-gray-600">
          <p>Choose how you want to add members to your organization:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              <strong>Invite External User by Email:</strong> Send an invitation email to someone
              outside your organization
            </li>
            <li>
              <strong>Add Existing Organization Member:</strong> View and manage current
              organization members
            </li>
          </ul>
        </div>

        <Form form={form} layout="vertical" onFinish={handleClick} className="mt-4">
          <Form.Item label="Invitation Method" name="inviteMode" initialValue="email">
            <Select size="large" onChange={(value) => setInviteMode(value)}>
              <Select.Option value="email">Invite External User by Email</Select.Option>
              <Select.Option value="existing">
                Add Existing Organization Member ({existingUsers.length} available)
              </Select.Option>
            </Select>
          </Form.Item>

          {inviteMode === 'existing' ? (
            <Form.Item
              label="Select Organization Member"
              name="userId"
              rules={[{ required: true, message: 'Please select a member' }]}
            >
              <Select
                size="large"
                placeholder="Select a member to add"
                loading={loadingUsers}
                showSearch
                optionFilterProp="label"
                labelInValue
               options={existingUsers.map((user) => ({
                 label: `${user.name} (${user.email})`,
                 value: user.id,
                 render: (
                   <div className="flex flex-col min-w-0">
                     <span className="font-medium truncate">{user.name}</span>
                     <span className="text-sm text-gray-400 truncate">{user.email}</span>
                   </div>
                 ),
               }))}
                optionRender={(option) => option.data.render}
              />
            </Form.Item>
          ) : (
            <Form.Item
              label="Email Address"
              name="email"
              rules={[
                { required: true, message: 'Please enter an email address' },
                { type: 'email', message: 'Please enter a valid email address' },
              ]}
            >
              <Input
                size="large"
                placeholder="Enter email address to invite external user"
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
              {inviteMode === 'existing' ? 'View Member Info' : 'Send Invitation'}
            </Button>
          </div>
        </Form>

        {inviteMode === 'existing' && existingUsers.length === 0 && !loadingUsers && (
          <div className="text-center text-gray-500 py-4">No organization members found</div>
        )}
      </Modal>

       {/* Confirmation Modal - Separated */}
       <Modal
         title={inviteMode === 'existing' ? 'Confirm Member Addition' : 'Confirm Email Invitation'}
         open={confirmModalOpen}
         onOk={handleConfirmOk}
         onCancel={handleConfirmCancel}
         okText={inviteMode === 'existing' ? 'Yes, Add Member' : 'Yes, Send Invitation'}
         cancelText="Cancel"
         okType="primary"
         centered
         width={500}
         confirmLoading={loading}
         maskClosable={false}
         destroyOnClose
       >
         <div>
           <p>
             {inviteMode === 'existing' 
               ? 'Are you sure you want to add this member to your organization?'
               : 'Are you sure you want to send an invitation to this email address?'
             }
           </p>
           <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
             <p className="text-yellow-800 font-medium">
               ⚠️ {inviteMode === 'existing' 
                 ? 'You will be charged for this user'
                 : 'You will be charged when the user accepts'
               }
             </p>
             <p className="text-sm text-yellow-700 mt-1">
               {inviteMode === 'existing'
                 ? 'Adding this user will result in additional charges to your account.'
                 : 'Charges will apply once the invited user accepts the invitation and joins your organization.'
               }
             </p>
           </div>
           {formValues && (
             <div className="mt-3 p-2 bg-gray-50 rounded">
               {inviteMode === 'existing' ? (
                 <>
                   <p className="text-sm">
                     <strong>User:</strong> {existingUsers.find(u => u.id === formValues.userId?.value)?.name || 'Unknown User'}
                   </p>
                   <p className="text-sm">
                     <strong>Email:</strong> {existingUsers.find(u => u.id === formValues.userId?.value)?.email || 'Unknown Email'}
                   </p>
                 </>
               ) : (
                 <>
                   <p className="text-sm">
                     <strong>Email:</strong> {formValues.email}
                   </p>
                 </>
               )}
               <p className="text-sm">
                 <strong>Role:</strong> {formValues.role}
               </p>
             </div>
           )}
         </div>
       </Modal>
    </>
  );
};

export default AddOrganizationMemberModal;
