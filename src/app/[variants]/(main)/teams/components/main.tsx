'use client';

import { Button, Empty, Form, Input, List, Modal, Select, Typography } from 'antd';
import { Metadata } from 'next';
import React, { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import CreateOrganizationModal from '@/features/Organization/CreateOrganizationModal';
import { useOrganizationStore } from '@/store/organization/store';

import { AppSidebar } from './sidebar/AppSiderbar';

const Main = () => {
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);

  const { organizations, isLoading, fetchOrganizations, inviteMember, isInviting } =
    useOrganizationStore();
  const currentOrganization = organizations[0];
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);
  return (
    <>
      {!currentOrganization && !isLoading ? (
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
        <div className="bg-black">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset></SidebarInset>
          </SidebarProvider>
        </div>
      )}
      <CreateOrganizationModal
        onClose={() => setShowCreateOrgModal(false)}
        open={showCreateOrgModal}
      />
    </>
  );
};

export default Main;
