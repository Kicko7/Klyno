'use client';

import { Form, Input, Modal } from 'antd';
import React from 'react';

import { useOrganizationStore } from '@/store/organization/store';
import { useSharedFolderStore } from '@/store/sharedFolder/store';
import { useUserStore } from '@/store/user';

interface CreateOrganizationModalProps {
  onClose: () => void;
  open: boolean;
}

const CreateParentFolderModal: React.FC<CreateOrganizationModalProps> = ({ onClose, open }) => {
  const [form] = Form.useForm();
  const { createSharedFolder, loading } = useSharedFolderStore();
  const user = useUserStore((state) => state.user);
  const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId);

  const handleCreate = async () => {
    try {
      if (!user) return;
      if (!selectedOrganizationId) return;
      const values = await form.validateFields();
      await createSharedFolder({
        name: values.name,
        userId: user.id,
        organizationId: selectedOrganizationId,
      });
      onClose();
    } catch (errorInfo) {
      console.error('Failed to create organization:', errorInfo);
    }
  };

  return (
    <Modal
      centered
      confirmLoading={loading}
      destroyOnHidden
      onCancel={onClose}
      onOk={handleCreate}
      open={open}
      title="Create Folder"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Folder Name"
          name="name"
          rules={[{ message: 'Please input folder name', required: true }]}
        >
          <Input placeholder="Enter Folder Name" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateParentFolderModal;
