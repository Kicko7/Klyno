'use client';

import { Avatar, Button, Empty, List, Modal, Spin, Tag, Typography } from 'antd';
import { Plus, UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useOrganizationStore } from '@/store/organization/store';

import { AppSidebar } from '../components/sidebar/AppSiderbar';

const { Title, Text } = Typography;

const MembersPage = () => {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('organizationId');
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const {
    organizationMembers,
    isFetchingMembers,
    fetchOrganizationMembers,
    organizations,
    fetchOrganizations,
  } = useOrganizationStore();

  const currentOrganization = organizations.find(org => org.id === organizationId) || organizations[0];

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationMembers(organizationId);
    }
  }, [organizationId, fetchOrganizationMembers]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

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

  if (!organizationId) {
    return (
      <div className="bg-black min-h-screen text-white">
        <SidebarProvider>
          <AppSidebar userOrgs={organizations} />
          <SidebarInset className="flex items-center justify-center">
            <Empty
              description="No organization selected"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </SidebarInset>
        </SidebarProvider>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white">
      <SidebarProvider>
        <AppSidebar userOrgs={organizations} />
        <SidebarInset className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Title level={2} className="text-white m-0">
                  {currentOrganization?.name || 'Organization'} Members
                </Title>
                <Text className="text-gray-400">
                  Manage members and their roles in your organization
                </Text>
              </div>
              <Button
                type="primary"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={handleInviteMember}
                className="bg-blue-600 hover:bg-blue-700 border-blue-600"
              >
                Invite Member
              </Button>
            </div>

            {isFetchingMembers ? (
              <div className="flex justify-center items-center h-64">
                <Spin size="large" />
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg">
                <List
                  dataSource={organizationMembers}
                  renderItem={(member: any) => (
                    <List.Item className="border-b border-gray-800 px-6 py-4">
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            size={48} 
                            className="bg-blue-600"
                          >
                            {member.userId?.charAt(0)?.toUpperCase() || 'U'}
                          </Avatar>
                        }
                        title={
                          <div className="flex items-center gap-3">
                            <Text className="text-white text-lg font-medium">
                              {member.userId || 'Unknown User'}
                            </Text>
                            <Tag color={getRoleColor(member.memberRole)}>
                              {getRoleDisplayName(member.memberRole)}
                            </Tag>
                          </div>
                        }
                        description={
                          <Text className="text-gray-400">
                            Joined {member.createdAt 
                              ? new Date(member.createdAt).toLocaleDateString()
                              : 'Unknown date'
                            }
                            {member.accessedAt && (
                              <span className="ml-4">
                                Last active {new Date(member.accessedAt).toLocaleDateString()}
                              </span>
                            )}
                          </Text>
                        }
                      />
                      <div className="flex items-center gap-2">
                        {member.isActive ? (
                          <Tag color="green">Active</Tag>
                        ) : (
                          <Tag color="red">Inactive</Tag>
                        )}
                      </div>
                    </List.Item>
                  )}
                  locale={{
                    emptyText: (
                      <Empty
                        description="No members found"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        className="py-12"
                      >
                        <Button
                          type="primary"
                          icon={<UserPlus className="w-4 h-4" />}
                          onClick={handleInviteMember}
                          className="bg-blue-600 hover:bg-blue-700 border-blue-600"
                        >
                          Invite First Member
                        </Button>
                      </Empty>
                    ),
                  }}
                />
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Modal
        title="Invite Member"
        open={showInviteModal}
        onCancel={() => setShowInviteModal(false)}
        footer={null}
        className="invite-member-modal"
      >
        <div className="p-4">
          <Text className="text-gray-600">
            Member invitation functionality will be implemented here.
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default MembersPage;
