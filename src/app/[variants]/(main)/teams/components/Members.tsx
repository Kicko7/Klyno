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
import { useTheme } from 'antd-style';
import { Search, Trash2, UserPlus } from 'lucide-react';
import { nanoid } from 'nanoid';
import React, { useEffect, useMemo, useState } from 'react';

import { renderEmail } from '@/libs/emails/render-email';
import { OrganizationInvitation } from '@/libs/emails/templates/organization-invitation';
import { useOrganizationStore } from '@/store/organization/store';

import AddOrganizationMemberModal from './AddOrganizationMemberModal';

const { Title, Text } = Typography;
const { Option } = Select;

interface MembersProps {
  organizationId?: string;
}

const Members: React.FC<MembersProps> = ({ organizationId }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; email: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    organizationMembers,
    isFetchingMembers,
    fetchOrganizationMembers,
    organizations,
    inviteMember,
    isInviting,
    removeMember,
    deleteOrganization,
  } = useOrganizationStore();

  const currentOrganization = organizationId
    ? organizations.find((org) => org.id === organizationId)
    : organizations[0];

  useEffect(() => {
    if (currentOrganization?.id && !isFetchingMembers) {
      console.log('🔄 Fetching members for organization:', currentOrganization.id);
      fetchOrganizationMembers(currentOrganization.id);
    }
  }, [currentOrganization?.id]); // Remove fetchOrganizationMembers from dependencies

  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    // Debug: Log the raw organization members to check for duplicates
    // Check for duplicates by userId
    const userIds = organizationMembers.map((member: any) => member.userId);
    const uniqueUserIds = [...new Set(userIds)];

    // Deduplicate members by userId (keep the first occurrence)
    const deduplicatedMembers = organizationMembers.reduce((acc: any[], member: any) => {
      const existingMember = acc.find((m) => m.userId === member.userId);
      if (!existingMember) {
        acc.push(member);
      } else {
      }
      return acc;
    }, []);

    if (!searchTerm) return deduplicatedMembers;

    return deduplicatedMembers.filter(
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

  const handleInviteSuccess = () => {
    if (currentOrganization?.id) {
      fetchOrganizationMembers(currentOrganization.id);
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

  const handleRemoveClick = (memberId: string, memberEmail: string) => {
    setMemberToRemove({ id: memberId, email: memberEmail });
    setShowRemoveModal(true);
  };

  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);

  const handleRemoveMember = async () => {
    if (!currentOrganization?.id || !memberToRemove) return;

    try {
      setIsRemovingMember(true);
      await removeMember(currentOrganization.id, memberToRemove.id);
      message.success(`Successfully removed ${memberToRemove.email} from the organization`);
      // Refresh the members list
      fetchOrganizationMembers(currentOrganization.id);
      setShowRemoveModal(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
      message.error('Failed to remove member. Please try again.');
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleCancelRemove = () => {
    setShowRemoveModal(false);
    setMemberToRemove(null);
  };

  const handleDeleteOrgClick = () => {
    setShowDeleteOrgModal(true);
  };

  const handleDeleteOrganization = async () => {
    if (!currentOrganization?.id) return;

    try {
      setIsDeletingOrg(true);
      await deleteOrganization(currentOrganization.id);
      message.success(`Successfully deleted ${currentOrganization.name} organization`);
      setShowDeleteOrgModal(false);
      // The organization list will be refreshed automatically by the store
    } catch (error) {
      console.error('Error deleting organization:', error);
      message.error('Failed to delete organization. Please try again.');
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const handleCancelDeleteOrg = () => {
    setShowDeleteOrgModal(false);
  };

  const theme = useTheme();

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

  const isAdmin = currentOrganization.memberRole === 'owner';

  return (
    <div
      className={`min-h-screen ${theme.appearance == 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}
    >
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
          <div className="flex gap-2">
            <Button
              type="primary"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={handleInviteMember}
              className="bg-blue-600 hover:bg-blue-700 border-blue-600 shadow-lg"
            >
              Invite Member
            </Button>
            {isAdmin && (
              <Button
                danger
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleDeleteOrgClick}
                className="bg-red-600 hover:bg-red-700 border-red-600 shadow-lg"
              >
                Delete Organization
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder="Search members by name, email, or user ID..."
            prefix={<Search className="w-4 h-4 text-gray-400" />}
            value={searchTerm}
            onChange={handleSearchChange}
            className="bg-[#2a3038] border-gray-600/50 text-white placeholder-gray-400 hover:border-gray-500 focus:border-blue-500"
          />
        </div>

        {/* Members List */}
        {isFetchingMembers ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : (
          <div className="rounded-lg border-white/10 shadow-sm">
            <List
              dataSource={paginatedMembers}
              renderItem={(member: any) => (
                <List.Item className="border-b border-white/10 px-6 py-4 m-2 transition-colors">
                  <List.Item.Meta
                    avatar={
                      <Avatar size={48} className=" bg-blue-600 text-white font-medium">
                        {member.email?.charAt(0)?.toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <div className="flex items-center gap-3 flex-wrap">
                        <Text className="text-white text-lg font-medium">{member.email}</Text>
                        <Tag color={getRoleColor(member.role || member.memberRole)}>
                          {getRoleDisplayName(member.role || member.memberRole)}
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="space-y-1">
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

                    {/* Remove member button - only show for non-admin members */}

                    {(member.role || member.memberRole) !== 'owner' && isAdmin && (
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 className="w-4 h-4" />}
                        size="small"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        title="Remove member"
                        onClick={() => handleRemoveClick(member.userId, member.email)}
                      />
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

      {/* Add Organization Member Modal */}
      <AddOrganizationMemberModal
        open={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          handleInviteSuccess();
        }}
        organizationId={currentOrganization?.id}
      />

      {/* Remove Member Confirmation Modal */}
      <Modal
        title="Remove Member"
        open={showRemoveModal}
        onOk={handleRemoveMember}
        onCancel={handleCancelRemove}
        okText="Yes, Remove"
        cancelText="Cancel"
        okButtonProps={{
          danger: true,
          loading: isRemovingMember,
          className: 'bg-red-600 hover:bg-red-700 border-red-600',
        }}
        cancelButtonProps={{
          disabled: isRemovingMember,
          className: 'border-gray-500 text-gray-300 hover:border-gray-400',
        }}
        centered
        className="text-white"
      >
        <div className="text-center py-4">
          <div className="text-red-400 mb-4">
            <Trash2 className="w-12 h-12 mx-auto mb-2" />
          </div>
          <p className="text-lg mb-2">Are you sure you want to remove this member?</p>
          <p className="text-gray-400">
            <strong className="text-black">{memberToRemove?.email}</strong> will be removed from the
            organization.
          </p>
          <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
        </div>
      </Modal>

      {/* Delete Organization Confirmation Modal */}
      <Modal
        title="Delete Organization"
        open={showDeleteOrgModal}
        onOk={handleDeleteOrganization}
        onCancel={handleCancelDeleteOrg}
        okText="Yes, Delete"
        cancelText="Cancel"
        okButtonProps={{
          danger: true,
          loading: isDeletingOrg,
          className: 'bg-red-600 hover:bg-red-700 border-red-600',
        }}
        cancelButtonProps={{
          disabled: isDeletingOrg,
          className: 'border-gray-500 text-gray-300 hover:border-gray-400',
        }}
        centered
        className="text-white"
      >
        <div className="text-center py-4">
          <div className="text-red-500 mb-4">
            <Trash2 className="w-16 h-16 mx-auto mb-2" />
          </div>
          <p className="text-xl mb-2 font-semibold">Delete Organization</p>
          <p className="text-lg mb-4">
            Are you sure you want to delete{' '}
            <strong className="text-red-500">{currentOrganization?.name}</strong>?
          </p>
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-500 text-sm">
              <strong>Warning:</strong> This will permanently delete the organization and all its
              data including:
            </p>
            <ul className="text-red-500 text-sm mt-2 text-left list-disc list-inside">
              <li>All team members and their access</li>
              <li>All team chats and messages</li>
              <li>All organization settings and configurations</li>
              <li>All associated data and files</li>
            </ul>
          </div>
          <p className="text-sm text-gray-500">This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
};

export default Members;
