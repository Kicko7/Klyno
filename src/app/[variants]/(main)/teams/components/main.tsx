'use client';

import { Button, Empty, Form, Input, List, Modal, Select, Typography } from 'antd';
import { Metadata } from 'next';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import CreateOrganizationModal from '@/features/Organization/CreateOrganizationModal';
import { useOrganizationStore } from '@/store/organization/store';

import Members from './Members';
import TeamChat from './TeamChat';
import TeamWelcome from './TeamWelcome';
import { AppSidebar } from './sidebar/AppSiderbar';
import { useTheme } from 'antd-style';

const Main = () => {
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const organizationId = searchParams.get('organizationId');

  const {
    organizations,
    isLoading,
    fetchOrganizations,
    CreateOrgModal: showOrgModel,
    showCreateOrgModal,
    hideCreateOrgModal,
  } = useOrganizationStore();
  const currentOrganization = organizations[0];
  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations]);
  

  const renderContent = () => {
    if (view === 'members') {
      return <Members organizationId={organizationId || currentOrganization?.id} />;
    }
    if (view === 'chat') {
      return (
        <div className="h-full w-full bg-black">
          <TeamChat />
        </div>
      );
    }
    // Default content - TeamWelcome with Welcome to Klyno AI
    return (
      <div className="h-full w-full bg-black">
        <TeamWelcome />
      </div>
    );
  };
  const theme = useTheme();

  return (
    <div className={` ${theme.appearance == "dark" ? "bg-black":"bg-white"} w-full h-full text-white`}>
      {isLoading ? (
        <Flexbox align="center" justify="center" style={{ minHeight: '100vh', width: '100%' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            <Typography.Text className="text-slate-400">Loading organizations...</Typography.Text>
          </div>
        </Flexbox>
      ) : !currentOrganization ? (
        <Flexbox align="center" justify="center" style={{ minHeight: '40vh', width: '100%' }}>
          <Empty
            description="You are not part of any organization yet."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button onClick={() => showCreateOrgModal()} size="large" type="primary">
              Create Organization
            </Button>
          </Empty>
        </Flexbox>
      ) : (
        <>
          <SidebarProvider>
            <AppSidebar userOrgs={organizations} />
            <SidebarInset>{renderContent()}</SidebarInset>
          </SidebarProvider>
        </>
      )}
      <CreateOrganizationModal onClose={() => hideCreateOrgModal()} open={showOrgModel} />
    </div>
  );
};

export default Main;
