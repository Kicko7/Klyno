'use client';

import { App, Button, Form, Modal, Select, Table } from 'antd';
import { Trash2, UserPlus, Users } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { lambdaClient } from '@/libs/trpc/client';
import { useTeamChatStore } from '@/store/teamChat';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  teamId?: string;
}

interface WorkspaceUser {
  id: string;
  name: string;
  email?: string;
}

const AddMemberModal = ({ open, onClose, teamId }: AddMemberModalProps) => {
  return (
    <App>
      <AddMemberModalContent open={open} onClose={onClose} teamId={teamId} />
    </App>
  );
};

const AddMemberModalContent: React.FC<AddMemberModalProps> = ({ open, onClose, teamId }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [currentMembers, setCurrentMembers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { refreshSidebar } = useTeamChatStore();

  const fetchWorkspaceUsers = useCallback(async () => {
    if (!teamId || !open) return;

    // Get team chat data
    const chat = await lambdaClient.teamChat.getTeamChatById.query({ id: teamId });
    if (!chat?.organizationId) return;

    setLoadingUsers(true);
    try {
      // Fetch all organization members
      const orgMembers = await lambdaClient.organization.getOrganizationMembers.query({
        organizationId: chat.organizationId,
      });

      // Map organization members to a lookup
      const orgMembersMap = new Map(
        orgMembers.map((member: any) => [
          member.userId,
          {
            id: member.userId,
            name: member.name || member.email || 'Unknown User',
            email: member.email || '',
          },
        ]),
      );

      // Get current members
      const members = (chat.metadata?.memberAccess || []).map((member) => ({
        ...member,
        ...orgMembersMap.get(member.userId),
        key: member.userId, // Add unique key for Table component
      }));
      setCurrentMembers(members);

      // Filter out users who are already in the team chat
      const currentMemberIds = new Set(members.map((m) => m.userId));
      const availableUsers = orgMembers
        .filter((member: any) => !currentMemberIds.has(member.userId))
        .map((member: any) => ({
          id: member.userId,
          name: member.name || member.email || 'Unknown User',
          email: member.email || '',
        }));

      setWorkspaceUsers(availableUsers);
    } catch (error) {
      console.error('Error fetching organization users:', error);
      const { message: messageApi } = App.useApp();
      messageApi.error('Failed to fetch organization members');
      setWorkspaceUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [teamId, open]);

  useEffect(() => {
    fetchWorkspaceUsers();
  }, [teamId, open, fetchWorkspaceUsers]);

  const handleRemoveMember = async (userId: string) => {
    try {
      setLoading(true);
      await lambdaClient.teamChat.removeChatMember.mutate({
        chatId: teamId!,
        userId,
      });

      // Refresh team chats to update the sidebar
      const chat = await lambdaClient.teamChat.getTeamChatById.query({ id: teamId! });
      if (chat?.organizationId) {
        await refreshSidebar();
      }

      message.success('Member removed successfully');

      // Refresh the member list
      await fetchWorkspaceUsers();
    } catch (error: any) {
      message.error(error?.message || 'Failed to remove member');
      console.error('Error removing member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: { userId: string }) => {
    try {
      setLoading(true);

      if (!teamId) {
        throw new Error('Team chat ID is required');
      }

      // Get team chat data
      const chat = await lambdaClient.teamChat.getTeamChatById.query({ id: teamId });
      if (!chat?.organizationId) {
        throw new Error('Organization ID not found for this team chat');
      }

      // Add user to team chat
      await lambdaClient.teamChat.addChatMember.mutate({
        chatId: teamId,
        userId: values.userId,
        role: 'member',
      });

      const selectedUser = workspaceUsers.find((user) => user.id === values.userId);
      message.success(
        `${selectedUser?.name || 'User'} has been added to the team chat successfully!`,
      );

      // Refresh team chats to update the sidebar
      await refreshSidebar();

      // Also refresh the current member list
      await fetchWorkspaceUsers();

      form.resetFields();
      onClose();
    } catch (error: any) {
      message.error(error?.message || 'Failed to add member to team chat');
      console.error('Error adding member:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add Chat Member
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Flexbox gap={24} className="mt-4">
        {/* Current Members Section */}
        <div>
          <h3 className="flex items-center gap-2 mb-3 text-base">
            <Users className="w-4 h-4" />
            Current Members
          </h3>
          <Table
            columns={[
              {
                title: 'Member',
                dataIndex: 'name',
                key: 'name',
                render: (text: string, record: any) => (
                  <div>
                    <div>{text}</div>
                    {record.email && <div className="text-xs text-gray-400">{record.email}</div>}
                  </div>
                ),
              },
              {
                title: 'Role',
                dataIndex: 'role',
                key: 'role',
                width: 120,
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 100,
                render: (_: any, record: any) => (
                  <Button
                    type="text"
                    danger
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => handleRemoveMember(record.userId)}
                    disabled={record.role === 'owner'}
                  />
                ),
              },
            ]}
            dataSource={currentMembers}
            size="small"
            pagination={false}
            loading={loadingUsers}
          />
        </div>

        {/* Add Member Form */}
        <div>
          <h3 className="flex items-center gap-2 mb-3 text-base">
            <UserPlus className="w-4 h-4" />
            Add New Member
          </h3>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <div className="flex gap-3">
              <style jsx>{`
                .ant-select-selector {
                  overflow: hidden !important;
                }
                .ant-select-selection-item {
                  overflow: hidden !important;
                  text-overflow: ellipsis !important;
                  white-space: nowrap !important;
                  max-width: 100% !important;
                }
              `}</style>
              <Form.Item
                name="userId"
                className="flex-1"
                rules={[{ required: true, message: 'Please select a user' }]}
              >
                <Select
                  placeholder="Select user"
                  loading={loadingUsers}
                  showSearch
                  optionFilterProp="label"
                  className="w-full"
                  style={{ width: '100%' }}
                  options={workspaceUsers.map((user) => ({
                    label: user.email || user.name,
                    value: user.id,
                  }))}
                  optionRender={(option) => (
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{workspaceUsers.find(u => u.id === option.value)?.name}</span>
                      {workspaceUsers.find(u => u.id === option.value)?.email && (
                        <span className="text-sm text-gray-400 truncate">{workspaceUsers.find(u => u.id === option.value)?.email}</span>
                      )}
                    </div>
                  )}
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<UserPlus className="w-4 h-4" />}
                  disabled={workspaceUsers.length === 0}
                >
                  Add
                </Button>
              </Form.Item>
            </div>
          </Form>

          {workspaceUsers.length === 0 && !loadingUsers && (
            <div className="text-center text-gray-500 py-4">
              No available organization members to add to this chat
            </div>
          )}
        </div>
      </Flexbox>
    </Modal>
  );
};

export default AddMemberModal;
