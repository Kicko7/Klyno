'use client';

import {
  Avatar,
  Button,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Pagination,
  Select,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { Search, UserPlus } from 'lucide-react';
import { nanoid } from 'nanoid';
import React, { useEffect, useMemo, useState } from 'react';

import { renderEmail } from '@/libs/emails/render-email';
import { OrganizationInvitation } from '@/libs/emails/templates/organization-invitation';
import { useOrganizationStore } from '@/store/organization/store';

const { Title, Text } = Typography;
const { Option } = Select;

interface MembersProps {
  organizationId?: string;
}

const Members: React.FC<MembersProps> = ({ organizationId }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm();

  const {
    organizationMembers,
    isFetchingMembers,
    fetchOrganizationMembers,
    organizations,
    inviteMember,
    isInviting,
  } = useOrganizationStore();

  const currentOrganization = organizationId
    ? organizations.find((org) => org.id === organizationId)
    : organizations[0];

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchOrganizationMembers(currentOrganization.id);
    }
  }, [currentOrganization?.id, fetchOrganizationMembers]);

  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm) return organizationMembers;

    return organizationMembers.filter(
      (member: any) =>
        member.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [organizationMembers, searchTerm]);

  // Paginate filtered members
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredMembers.slice(start, end);
  }, [filteredMembers, currentPage, pageSize]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'gold';
      case 'admin':
        return 'red';
      case 'member':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      default:
        return role;
    }
  };

  const handleInviteMember = () => {
    setShowInviteModal(true);
  };

  const handleInviteSubmit = async () => {
    if (!currentOrganization?.id) return;

    try {
      const values = await form.validateFields();
      const token = nanoid();

      await inviteMember({
        email: values.email,
        organizationId: currentOrganization.id,
        role: values.role,
        teamId: '', // Empty team ID for organization-level invitations
      });

      message.success('Member invited successfully!');
      setShowInviteModal(false);
      form.resetFields();
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      message.error(error.message || 'Failed to invite member');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <Empty
          description={<span className="text-gray-400">No organization selected</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#262C33] text-white">
      <div className="p-6 w-full h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex-1">
            <Title level={2} className="text-white m-0 text-xl sm:text-2xl">
              {currentOrganization.name} Members
            </Title>
            <Text className="text-gray-400 text-sm sm:text-base">
              Manage members and their roles in your organization
            </Text>
          </div>
          <Button
            type="primary"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={handleInviteMember}
            className="bg-blue-600 hover:bg-blue-700 border-blue-600 shadow-lg"
          >
            Invite Member
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder="Search members by name, email, or user ID..."
            prefix={<Search className="w-4 h-4 text-gray-400" />}
            value={searchTerm}
            onChange={handleSearchChange}
            className="bg-[#2a3038] border-gray-600/50 text-white placeholder-gray-400 hover:border-gray-500 focus:border-blue-500"
            style={{
              backgroundColor: '#2a3038',
              borderColor: 'rgba(107, 114, 128, 0.5)',
              color: '#ffffff',
            }}
          />
        </div>

        {/* Members List */}
        {isFetchingMembers ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : (
          <div className="bg-[#2a3038] rounded-lg border border-gray-600/30 shadow-sm">
            <List
              dataSource={paginatedMembers}
              renderItem={(member: any) => (
                <List.Item className="border-b border-gray-600/30 px-6 py-4 hover:bg-[#2f3640] transition-colors">
                  <List.Item.Meta
                    avatar={
                      <Avatar size={48} className="bg-blue-600 text-white font-medium">
                        {member.name?.charAt(0)?.toUpperCase() ||
                          member.userId?.charAt(0)?.toUpperCase() ||
                          member.email?.charAt(0)?.toUpperCase() ||
                          'U'}
                      </Avatar>
                    }
                    title={
                      <div className="flex items-center gap-3 flex-wrap">
                        <Text className="text-white text-lg font-medium">
                          {member.name || member.userId || 'Unknown User'}
                        </Text>
                        <Tag color={getRoleColor(member.role || member.memberRole)}>
                          {getRoleDisplayName(member.role || member.memberRole)}
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        <Text className="text-gray-400 block">
                          {member.email && <span className="mr-4">{member.email}</span>}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                          Joined{' '}
                          {member.createdAt
                            ? new Date(member.createdAt).toLocaleDateString()
                            : 'Unknown date'}
                          {member.accessedAt && (
                            <span className="ml-4">
                              • Last active {new Date(member.accessedAt).toLocaleDateString()}
                            </span>
                          )}
                        </Text>
                      </div>
                    }
                  />
                  <div className="flex items-center gap-2">
                    {member.isActive !== undefined ? (
                      <Tag color={member.isActive ? 'green' : 'red'}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </Tag>
                    ) : (
                      <Tag color="green">Active</Tag>
                    )}
                  </div>
                </List.Item>
              )}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      <span className="text-gray-400">
                        {searchTerm ? 'No members found matching your search' : 'No members found'}
                      </span>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    className="py-12"
                  >
                    {!searchTerm && (
                      <Button
                        type="primary"
                        icon={<UserPlus className="w-4 h-4" />}
                        onClick={handleInviteMember}
                        className="bg-blue-600 hover:bg-blue-700 border-blue-600"
                      >
                        Invite First Member
                      </Button>
                    )}
                  </Empty>
                ),
              }}
            />

            {/* Pagination */}
            {filteredMembers.length > pageSize && (
              <div className="p-4 border-t border-gray-600/30 flex justify-center">
                <Pagination
                  current={currentPage}
                  total={filteredMembers.length}
                  pageSize={pageSize}
                  onChange={handlePageChange}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total, range) => (
                    <span className="text-gray-400">
                      {range[0]}-{range[1]} of {total} members
                    </span>
                  )}
                  className="text-white"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <Modal
        title={<span className="text-white">Invite New Member</span>}
        open={showInviteModal}
        onCancel={() => {
          setShowInviteModal(false);
          form.resetFields();
        }}
        onOk={handleInviteSubmit}
        confirmLoading={isInviting}
        className="invite-member-modal"
        styles={{
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
          content: { backgroundColor: '#1f2937', border: '1px solid #374151' },
        }}
      >
        <div className="bg-gray-800 p-6 rounded-lg">
          <Form form={form} layout="vertical" className="space-y-4">
            <Form.Item
              label={<span className="text-white">Email Address</span>}
              name="email"
              rules={[
                { required: true, message: 'Please enter an email address' },
                { type: 'email', message: 'Please enter a valid email address' },
              ]}
            >
              <Input
                placeholder="Enter email address"
                className="bg-gray-700 border-gray-600 text-white"
                style={{
                  backgroundColor: '#374151',
                  borderColor: '#4b5563',
                  color: '#ffffff',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-white">Role</span>}
              name="role"
              initialValue="member"
              rules={[{ required: true, message: 'Please select a role' }]}
            >
              <Select
                placeholder="Select a role"
                className="custom-select"
                style={{
                  backgroundColor: '#374151',
                }}
                dropdownStyle={{
                  backgroundColor: '#374151',
                  border: '1px solid #4b5563',
                }}
              >
                <Option value="member">
                  <div className="flex items-center gap-2">
                    <Tag color="blue">Member</Tag>
                    <span className="text-gray-300">Can view and participate</span>
                  </div>
                </Option>
                <Option value="admin">
                  <div className="flex items-center gap-2">
                    <Tag color="red">Admin</Tag>
                    <span className="text-gray-300">Can manage members and settings</span>
                  </div>
                </Option>
              </Select>
            </Form.Item>

            <div className="bg-gray-700 p-3 rounded-lg">
              <Text className="text-gray-300 text-sm">
                💡 The invited user will receive an email invitation and can accept it to join the
                organization.
              </Text>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default Members;
