'use client';

import { Form, Input, Modal } from 'antd';
import React from 'react';

import { lambdaClient } from '@/libs/trpc/client';
import { useTeamStore } from '@/store/team/store';

interface CreateOrganizationModalProps {
  onClose: () => void;
  open: boolean;
}

const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({ onClose, open }) => {
  const [form] = Form.useForm();
  const { createTeam, isCreatingTeam } = useTeamStore();

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();

      // Get user's organizations to get the organization ID
      const organizations = await lambdaClient.organization.getMyOrganizations.query();

      if (organizations.length === 0) {
        throw new Error('No organization found. Please create an organization first.');
      }

      // Pass the correct object structure with name, description, and organizationId
      await createTeam({
        name: values.name,
        organizationId: organizations[0].id,
        description: values.description,
      });

      onClose();
    } catch (errorInfo) {
      console.error('Failed to create organization:', errorInfo);
    }
  };

  return (
    <Modal
      centered
      confirmLoading={isCreatingTeam}
      destroyOnHidden
      onCancel={onClose}
      onOk={handleCreate}
      open={open}
      title="Create Organization"
      width={600}
    >
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
    </Modal>
  );
};

export default CreateOrganizationModal;
