'use client';

import { Button, Empty, Form, Input, Modal, Select, Typography } from 'antd';
import { useResponsive } from 'antd-style';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import CircleLoading from '@/components/Loading/CircleLoading';
import CreateOrganizationModal from '@/features/Organization/CreateOrganizationModal';
import ResponsiveContainer from '@/features/Setting/SettingContainer';
import { useOrganizationStore } from '@/store/organization/store';

const { Title, Text } = Typography;

const OrganizationClient = () => {
  const { mobile } = useResponsive();
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [form] = Form.useForm();
  const { organizations, isLoading, fetchOrganizations, inviteMember, isInviting } =
    useOrganizationStore();

  const currentOrganization = organizations[0];

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleInvite = async () => {
    try {
      const values = await form.validateFields();
      if (!currentOrganization?.id) return;

      await inviteMember({
        email: values.email,
        organizationId: currentOrganization.id,
        role: values.role,
        teamId: '', // No team concept anymore
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
      {/* <ResponsiveContainer maxWidth={1000}>
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
                  Manage your teams and organization settings.
                </Text>
              )}
            </div>
            {currentOrganization && !teamId && (
              <Button
                icon={<TeamOutlined />}
                onClick={() => setShowCreateTeamModal(true)}
                size={mobile ? 'middle' : 'large'}
                type="primary"
              >
                Create Team
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
            <>
              <h4 className="text-4xl text-amber-700">hello there</h4>
              <SideBar />

              <List
                dataSource={teams}
                itemLayout="horizontal"
                loading={loadingTeams}
                renderItem={(team: any) => (
                  <List.Item
                    actions={[
                      <Button href={`/teams/${team.id}`} key="view" type="link">
                        View Team
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<TeamOutlined />}
                      description={team.description || 'No description'}
                      title={team.name}
                    />
                  </List.Item>
                )}
              />
            </>
          )}
        </Flexbox>
      </ResponsiveContainer> */}

      <CreateOrganizationModal
        onClose={() => setShowCreateOrgModal(false)}
        open={showCreateOrgModal}
      />
      {/* Invite Member Modal */}

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
