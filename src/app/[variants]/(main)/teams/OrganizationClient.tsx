'use client';

import { MailOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Input, List, Modal, Select, Typography } from 'antd';
import { useResponsive } from 'antd-style';
import React, { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import CircleLoading from '@/components/Loading/CircleLoading';
import CreateOrganizationModal from '@/features/Organization/CreateOrganizationModal';
import ResponsiveContainer from '@/features/Setting/SettingContainer';
import { useOrganizationStore } from '@/store/organization/store';
import { useSearchParams } from 'next/navigation'

const { Title, Text } = Typography;

const OrganizationClient = () => {
  const { mobile } = useResponsive();
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [form] = Form.useForm();
const teamId=useSearchParams().get('teamId')
  const {
    organizations,
    isLoading,
    fetchOrganizations,
    organizationMembers,
    isFetchingMembers,
    fetchOrganizationMembers,
    inviteMember,
    isInviting,
  } = useOrganizationStore();

  const currentOrganization = organizations[0];

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchOrganizationMembers(currentOrganization.id);
    }
  }, [currentOrganization?.id, fetchOrganizationMembers]);

  const handleInvite = async () => {
    try {
      const values = await form.validateFields();
      if (!currentOrganization?.id) return;

      await inviteMember({
        email: values.email,
        organizationId: currentOrganization.id,
        role: values.role,
        teamId: teamId || '',
      });

      setShowInviteModal(false);
      form.resetFields();
    } catch (errorInfo) {
      console.error('Failed to invite member:', errorInfo);
    }
  };

  if (isLoading) {
    return (
      <ResponsiveContainer>
        <Flexbox align={'center'} height={'60vh'} justify={'center'} width={'100%'}>
          <CircleLoading />
        </Flexbox>
      </ResponsiveContainer>
    );
  }

  return (
    <>
      <ResponsiveContainer maxWidth={1000}>
        <Flexbox gap={32} style={{ width: '100%' }}>
          <Flexbox
            align={mobile ? 'flex-start' : 'center'}
            gap={mobile ? 16 : 0}
            horizontal={!mobile}
            justify="space-between"
            style={{
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
              paddingBottom: 24,
              width: '100%',
            }}
          >
            <div style={{ flex: 1 }}>
              <Title level={2} style={{ fontSize: mobile ? 24 : 28, margin: 0 }}>
                {currentOrganization?.name || 'My Organization'}
              </Title>
              {!mobile && (
                <Text style={{ fontSize: 14 }} type="secondary">
                  Manage your organization members and settings.
                </Text>
              )}
            </div>
            {currentOrganization && (
              <Button
                icon={<MailOutlined />}
                onClick={() => setShowInviteModal(true)}
                size={mobile ? 'middle' : 'large'}
                type="primary"
              >
                Invite Member
              </Button>
            )}
          </Flexbox>

          {!currentOrganization ? (
            <Flexbox align="center" justify="center" style={{ minHeight: '40vh', width: '100%' }}>
              <Empty
                description="You are not part of any organization yet."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button onClick={() => setShowCreateOrgModal(true)} size="large" type="primary">
                  Create Organization
                </Button>
              </Empty>
            </Flexbox>
          ) : (
            <List
              dataSource={organizationMembers}
              itemLayout="horizontal"
              loading={isFetchingMembers}
              renderItem={(item: any) => (
                <List.Item
                  actions={[
                    <Select defaultValue={item.role} key="role" style={{ width: 120 }}>
                      <Select.Option value="admin">Admin</Select.Option>
                      <Select.Option value="member">Member</Select.Option>
                      {item.role === 'owner' && (
                        <Select.Option disabled value="owner">
                          Owner
                        </Select.Option>
                      )}
                    </Select>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<UserOutlined />}
                    description={item.email}
                    title={item.name}
                  />
                </List.Item>
              )}
            />
          )}
        </Flexbox>
      </ResponsiveContainer>

      <CreateOrganizationModal
        onClose={() => setShowCreateOrgModal(false)}
        open={showCreateOrgModal}
      />

      <Modal
        confirmLoading={isInviting}
        onCancel={() => setShowInviteModal(false)}
        onOk={handleInvite}
        open={showInviteModal}
        title="Invite New Member"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item label="Email Address" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="Enter email address" />
          </Form.Item>
          <Form.Item initialValue="member" label="Role" name="role" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="admin">Admin</Select.Option>
              <Select.Option value="member">Member</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default OrganizationClient;
