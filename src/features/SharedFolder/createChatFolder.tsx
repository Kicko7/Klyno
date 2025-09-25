'use client';

import { Form, Input, Modal } from 'antd';
import React from 'react';

import { useOrganizationStore } from '@/store/organization/store';
import { useSharedFolderStore } from '@/store/sharedFolder/store';
import { useUserStore } from '@/store/user';

interface CreateSubFolderChatProps {
  onClose: () => void;
  open: boolean;
}

const CreateSubFolderChat: React.FC<CreateSubFolderChatProps> = ({ onClose, open }) => {
  const [form] = Form.useForm();
  const { createSharedFolder, loading,selectedSubFolderId ,createChatInSubFolder} = useSharedFolderStore();
  const user = useUserStore((state) => state.user);
  const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId);

  const handleCreate = async () => {
    try {
      if (!selectedOrganizationId ||!selectedSubFolderId) return;
      const values = await form.validateFields();
      await createChatInSubFolder({
        title:values.name,
        organizationId:selectedOrganizationId,
        subFolderId:selectedSubFolderId,
        isInFolder:true
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
      title="Create Chat"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Create Chat"
          name="name"
          rules={[{ message: 'Please input chat name', required: true }]}
        >
          <Input placeholder="Enter Chat Name" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateSubFolderChat;
