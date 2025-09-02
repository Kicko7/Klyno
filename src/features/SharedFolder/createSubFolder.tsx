'use client';

import { Form, Input, Modal } from 'antd';
import React from 'react';

import { useOrganizationStore } from '@/store/organization/store';
import { useSharedFolderStore } from '@/store/sharedFolder/store';
import { useUserStore } from '@/store/user';

interface CreateSubFolderModalProps {
  onClose: () => void;
  open: boolean;
  parentId: string;
}

const CreateSubFolderModal: React.FC<CreateSubFolderModalProps> = ({ onClose, open, parentId }) => {
  const [form] = Form.useForm();
  const { createSharedSubFolder, loading } = useSharedFolderStore();
  const user = useUserStore((state) => state.user);

  const handleCreate = async () => {
    try {
      if (!user) return;
      if (!parentId) return;
      const values = await form.validateFields();
      await createSharedSubFolder({
        name:values.name,
        parentId
      })
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
      title="Create Sub Folder"
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

export default CreateSubFolderModal;
