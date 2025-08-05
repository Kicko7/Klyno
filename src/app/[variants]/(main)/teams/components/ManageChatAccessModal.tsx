'use client';

import { Button, Form, Modal, Select, Switch, Table, message } from 'antd';
import { Lock, Share2, Trash2, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { TeamChatItem } from '@/database/schemas/teamChat';
import { lambdaClient } from '@/libs/trpc/client';
import { useTeamChatStore } from '@/store/teamChat';

interface ManageChatAccessModalProps {
  open: boolean;
  onClose: () => void;
  teamChatId?: string;
}

interface WorkspaceUser {
  id: string;
  name: string;
  email?: string;
}

const ManageChatAccessModal = ({ open, onClose, teamChatId }: ManageChatAccessModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [teamChat, setTeamChat] = useState<TeamChatItem | null>(null);
  const { loadTeamChats } = useTeamChatStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!teamChatId || !open) return;

      setLoadingUsers(true);
      try {
        // Get team chat data
        const chat = await lambdaClient.teamChat.getTeamChatById.query({ id: teamChatId });
        if (!chat) return;
        setTeamChat(chat);

        // Fetch all organization members
        const orgMembers = await lambdaClient.organization.getOrganizationMembers.query({
          organizationId: chat.organizationId,
        });

        // Transform to WorkspaceUser format
        const users = orgMembers.map((member: any) => ({
          id: member.userId,
          name: member.name || member.email || 'Unknown User',
          email: member.email || '',
        }));

        setWorkspaceUsers(users);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to fetch data');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchData();
  }, [teamChatId, open]);

  const handleVisibilityChange = async (isPublic: boolean) => {
    if (!teamChatId || !teamChat) return;

    try {
      setLoading(true);
      await lambdaClient.teamChat.updateChatAccess.mutate({
        chatId: teamChatId,
        isPublic,
      });

      // Refresh team chats
      await loadTeamChats(teamChat.organizationId);
      message.success(`Chat is now ${isPublic ? 'public' : 'private'}`);
    } catch (error) {
      console.error('Error updating chat visibility:', error);
      message.error('Failed to update chat visibility');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (values: { userId: string; role: 'admin' | 'member' }) => {
    if (!teamChatId || !teamChat) return;

    try {
      setLoading(true);
      await lambdaClient.teamChat.addChatMember.mutate({
        chatId: teamChatId,
        userId: values.userId,
        role: values.role,
      });

      // Refresh team chats
      await loadTeamChats(teamChat.organizationId);
      form.resetFields();
      message.success('Member added successfully');
    } catch (error) {
      console.error('Error adding member:', error);
      message.error('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!teamChatId || !teamChat) return;

    try {
      setLoading(true);
      await lambdaClient.teamChat.removeChatMember.mutate({
        chatId: teamChatId,
        userId,
      });

      // Refresh team chats
      await loadTeamChats(teamChat.organizationId);
      message.success('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      message.error('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const memberColumns = [
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
  ];

  const members =
    teamChat?.metadata?.memberAccess?.map((member) => {
      const user = workspaceUsers.find((u) => u.id === member.userId);
      return {
        key: member.userId,
        userId: member.userId,
        name: user?.name || 'Unknown User',
        email: user?.email,
        role: member.role,
        addedAt: member.addedAt,
      };
    }) || [];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Manage Chat Access
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Flexbox gap={24} className="mt-4">
        {/* Visibility Section */}
        <div>
          <h3 className="flex items-center gap-2 mb-3 text-base">
            <Lock className="w-4 h-4" />
            Chat Visibility
          </h3>
          <div className="flex items-center gap-3">
            <Switch
              checked={teamChat?.metadata?.isPublic || false}
              onChange={handleVisibilityChange}
              loading={loading}
            />
            <span>
              {teamChat?.metadata?.isPublic
                ? 'Public - All organization members can view'
                : 'Private - Only added members can view'}
            </span>
          </div>
        </div>

        {/* Members Section */}
        <div>
          <h3 className="flex items-center gap-2 mb-3 text-base">
            <Users className="w-4 h-4" />
            Members
          </h3>
          <Table
            columns={memberColumns}
            dataSource={members}
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
          <Form form={form} layout="vertical" onFinish={handleAddMember}>
            <div className="flex gap-3">
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
                  options={workspaceUsers
                    .filter(
                      (user) =>
                        !members.some((member) => member.userId === user.id) &&
                        user.id !== teamChat?.userId,
                    )
                    .map((user) => ({
                      label: user.email || user.name,
                      value: user.id,
                    }))}
                />
              </Form.Item>
              <Form.Item
                name="role"
                initialValue="member"
                rules={[{ required: true, message: 'Please select a role' }]}
              >
                <Select
                  style={{ width: 120 }}
                  options={[
                    { label: 'Member', value: 'member' },
                    { label: 'Admin', value: 'admin' },
                  ]}
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  Add
                </Button>
              </Form.Item>
            </div>
          </Form>
        </div>
      </Flexbox>
    </Modal>
  );
};

export default ManageChatAccessModal;
