'use client';

import { Form, Input, message, Modal } from 'antd';
import React from 'react';

import { useOrganizationStore } from '@/store/organization/store';
import { useUserSubscription } from '@/hooks/useUserSubscription';

interface CreateOrganizationModalProps {
  onClose: () => void;
  open: boolean;
}

const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({ onClose, open }) => {
  const [form] = Form.useForm();
  const { createOrganization, isCreating } = useOrganizationStore();
  const {subscriptionInfo} = useUserSubscription()

  const handleCreate = async () => {
    if (!subscriptionInfo) {
      message.error('You need to subscribe to create an organization');
      return;
    }
    try {
      const values = await form.validateFields();
      await createOrganization(values.name);
      onClose();
    } catch (errorInfo) {
      console.error('Failed to create organization:', errorInfo);
    }
  };

  return (
    <Modal
      centered
      confirmLoading={isCreating}
      destroyOnHidden
      onCancel={onClose}
      onOk={handleCreate}
      open={open}
      title="Create Organization"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Organization Name"
          name="name"
          rules={[{ message: 'Please input an organization name', required: true }]}
        >
          <Input placeholder="Enter an organization name" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateOrganizationModal;
