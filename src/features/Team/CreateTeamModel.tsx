'use client';

import { Form, Input, Modal } from 'antd';
import React, { useState } from 'react';

import { lambdaClient } from '@/libs/trpc/client';
import { useTeamStore } from '@/store/team/store';

interface CreateTeamModalProps {
  onClose: () => void;
  open: boolean;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ onClose, open }) => {
  const [form] = Form.useForm();
  const { createTeam, isCreatingTeam } = useTeamStore();
  const [isCreating, setIsCreating] = useState(false);
  const handleCreate = async () => {
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
        description: values.description,
      });
      setIsCreating(false);

      onClose();
    } catch (errorInfo) {
      console.error('Failed to create organization:', errorInfo);
    }
  };

  return (
    <Modal
      centered
      confirmLoading={isCreatingTeam || isCreating}
      destroyOnHidden
      onCancel={onClose}
      onOk={handleCreate}
      open={open}
      title="Create new team"
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

export default CreateTeamModal;
