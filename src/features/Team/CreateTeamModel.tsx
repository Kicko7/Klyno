'use client';

import { Form, Input, Modal, message } from 'antd';
import React, { useState } from 'react';

import { lambdaClient } from '@/libs/trpc/client';
import { useTeamStore } from '@/store/team/store';
import { authSelectors, userProfileSelectors } from '@/store/user/selectors';
import { useUserStore } from '@/store/user/store';

interface CreateTeamModalProps {
  onClose: () => void;
  open: boolean;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ onClose, open }) => {
  const [form] = Form.useForm();

  // Get authentication state
  const isLoaded = useUserStore(authSelectors.isLoaded);
  const isSignedIn = useUserStore(authSelectors.isLoginWithAuth);
  const userId = useUserStore(userProfileSelectors.userId);

  const { createTeam, isCreatingTeam } = useTeamStore();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    console.log('Auth state:', { isLoaded, isSignedIn, userId });

    // Check if authentication is loaded
    if (!isLoaded) {
      throw new Error('Authentication is still loading. Please wait a moment and try again.');
    }

    // Check if user is signed in
    if (!isSignedIn) {
      throw new Error('Please sign in to create a team.');
    }

    // Check if user ID is available
    if (!userId) {
      throw new Error('User not found. Please try refreshing the page.');
    }

    try {
      setIsCreating(true);
      const values = await form.validateFields();

      const organizations = await lambdaClient.organization.getMyOrganizations.query();
      if (organizations.length === 0) {
        throw new Error('No organization found. Please create an organization first.');
      }

      await createTeam({
        name: values.name,
        organizationId: organizations[0].id,
        organizerId: userId,
        description: values.description,
      });

      // Show success message
      message.success('Team created successfully!');
      form.resetFields();
      onClose();
    } catch (errorInfo) {
      console.error('Failed to create team:', errorInfo);

      // Show user-friendly error message
      const errorMessage =
        errorInfo instanceof Error ? errorInfo.message : 'Failed to create team. Please try again.';

      // Show error message to user
      message.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading state if auth is not loaded
  const isAuthLoading = !isLoaded;
  const isUserNotSignedIn = isLoaded && !isSignedIn;

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      centered
      confirmLoading={isCreatingTeam || isCreating}
      destroyOnHidden
      onCancel={handleCancel}
      onOk={handleCreate}
      open={open}
      title="Create new team"
      width={600}
      okButtonProps={{
        disabled: isAuthLoading || isUserNotSignedIn,
        title: isAuthLoading
          ? 'Loading authentication...'
          : isUserNotSignedIn
            ? 'Please sign in first'
            : undefined,
      }}
    >
      {isAuthLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Loading authentication...</p>
        </div>
      ) : isUserNotSignedIn ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Please sign in to create a team.</p>
        </div>
      ) : (
        <Form form={form} layout="vertical">
          <Form.Item
            label="Team Name"
            name="name"
            rules={[{ message: 'Please input a team name', required: true }]}
          >
            <Input placeholder="Enter a team name" />
          </Form.Item>
          <Form.Item
            label="Description"
            name="description"
            rules={[{ max: 255, message: 'Description cannot exceed 255 characters' }]}
          >
            <Input.TextArea placeholder="Enter a team description (optional)" rows={3} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default CreateTeamModal;
