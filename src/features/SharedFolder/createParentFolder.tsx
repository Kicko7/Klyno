'use client';

import { Form, Input, Modal } from 'antd';
import React from 'react';

import { useSharedFolderStore } from '@/store/sharedFolder/store';
import { useUserStore } from '@/store/user';

interface CreateOrganizationModalProps {
  onClose: () => void;
  open: boolean;
}

const CreateParentFolderModal: React.FC<CreateOrganizationModalProps> = ({ onClose, open }) => {
  const [form] = Form.useForm();
  const {createSharedFolder,loading} = useSharedFolderStore()
  const user = useUserStore((state)=>state.user)

  const handleCreate = async () => {
    try {
      if(!user) return;
      const values = await form.validateFields();
      await createSharedFolder({
        name:values.name,
        userId:user.id
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
      title="Create Folder"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Folder Name"
          name="name"
          rules={[{ message: 'Please input an organization name', required: true }]}
        >
          <Input placeholder="Enter Folder Name" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateParentFolderModal;
