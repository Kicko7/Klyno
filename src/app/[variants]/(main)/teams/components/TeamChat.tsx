'use client';

import { ModelTag } from '@lobehub/icons';
import { ActionIcon } from '@lobehub/ui';
import { ChatHeader } from '@lobehub/ui/chat';
import { useResponsive } from 'antd-style';
import { UserPlus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { memo, useCallback, useEffect } from 'react';
import { Flexbox } from 'react-layout-kit';

import HeaderAction from '@/app/[variants]/(main)/chat/(workspace)/_layout/Desktop/ChatHeader/HeaderAction';
import { DESKTOP_HEADER_ICON_SIZE } from '@/const/layoutTokens';
import { SkeletonList } from '@/features/Conversation';
import ModelSwitchPanel from '@/features/ModelSwitchPanel';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useOrganizationStore } from '@/store/organization/store';
import { useTeamChatStore } from '@/store/teamChat';

import TeamChatSessionHydration from '../features/TeamChatSessionHydration';
import TeamChatWorkspace from '../features/TeamChatWorkspace';
import AddMemberModal from './AddMemberModal';
import TeamChatContent from './TeamChatContent';
import TeamMain from './TeamMain';

const TeamChat = memo(() => {
  const { mobile } = useResponsive();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chatId') || '';
  const { organizations, selectedOrganizationId } = useOrganizationStore();
  const currentOrganization = organizations?.find((org) => org.id === selectedOrganizationId);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Use dedicated team chat store
  const {
    teamChatsByOrg,
    activeTeamChatId,
    isLoading,
    createTeamChat,
    loadTeamChats,
    setActiveTeamChat,
    currentOrganizationId,
  } = useTeamChatStore();

  // Get chats for current organization
  const teamChats = currentOrganization?.id ? teamChatsByOrg[currentOrganization.id] || [] : [];

  // Get current model for the model switcher
  const [model, provider] = useAgentStore((s) => [
    agentSelectors.currentAgentModel(s),
    agentSelectors.currentAgentModelProvider(s),
  ]);

  // Load team chats when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      console.log('🔍 Loading team chats for organization:', currentOrganization.id);
      loadTeamChats(currentOrganization.id);
      // Clear active chat and URL when organization changes
      setActiveTeamChat(null);
      router.push('/teams');
    }
  }, [currentOrganization?.id, loadTeamChats, setActiveTeamChat, router]);

  // Validate chat access and set active chat
  useEffect(() => {
    if (chatId) {
      // Find the chat in current organization's chats
      const chat = teamChats.find((c) => c.id === chatId);
      if (chat && chat.organizationId === currentOrganization?.id) {
        setActiveTeamChat(chatId);
      } else {
        // If chat doesn't belong to current organization, clear URL
        console.log('⚠️ Chat not found in current organization');
        router.push('/teams');
      }
    }
  }, [chatId, teamChats, currentOrganization?.id, setActiveTeamChat, router]);

  // Only create first team chat if welcome page is shown and no chats exist
  useEffect(() => {
    if (
      !hasInitialized &&
      !chatId &&
      currentOrganization?.id &&
      (teamChats || []).length === 0 &&
      !isLoading
    ) {
      setHasInitialized(true);
      console.log('🚀 No team chats found, creating first one...');
      // Validate organization
      if (!organizations.some((org) => org.id === currentOrganization.id)) {
        console.error('❌ Invalid organization selected for chat creation');
        return;
      }
      createTeamChat(currentOrganization.id, 'Team Chat', {
        organizationId: currentOrganization.id,
      });
    }
  }, [
    hasInitialized,
    currentOrganization?.id,
    (teamChats || []).length,
    isLoading,
    createTeamChat,
    chatId,
    organizations,
  ]);

  const handleNewChat = useCallback(async () => {
    if (currentOrganization?.id) {
      // Validate organization
      if (!organizations.some((org) => org.id === currentOrganization.id)) {
        console.error('❌ Invalid organization selected for chat creation');
        return;
      }
      console.log('🚀 Creating new team chat...');
      await createTeamChat(currentOrganization.id, 'Team Chat', {
        organizationId: currentOrganization.id,
      });
    }
  }, [currentOrganization?.id, createTeamChat, organizations]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 TeamChat Debug:', {
      currentOrganization: currentOrganization?.id,
      teamChats: (teamChats || []).length,
      activeTeamChatId,
      isLoading,
    });
  }, [currentOrganization, teamChats, activeTeamChatId, isLoading]);

  return (
    <div className="flex flex-col h-full w-full bg-black relative">
      {/* Team Chat Header */}
      <ChatHeader
        left={
          <Flexbox align={'center'} gap={12} horizontal>
            <TeamMain />
            <ModelSwitchPanel>
              <ModelTag model={model} />
            </ModelSwitchPanel>
          </Flexbox>
        }
        right={
          <Flexbox gap={4} horizontal>
            <ActionIcon
              icon={UserPlus}
              onClick={() => setShowMemberModal(true)}
              size={DESKTOP_HEADER_ICON_SIZE}
              title="Add Team Members"
            />
            <HeaderAction />
          </Flexbox>
        }
        style={{ paddingInline: 8, position: 'initial', zIndex: 11 }}
      />

      {/* Main Content Area */}
      <Flexbox flex={1} horizontal>
        {/* Team Chat Content */}
        <Flexbox flex={1}>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <SkeletonList mobile={mobile} />
            </div>
          ) : activeTeamChatId ? (
            <TeamChatContent
              teamChatId={activeTeamChatId}
              mobile={mobile || false}
              onNewChat={handleNewChat}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <p>No team chat available</p>
                <button
                  onClick={handleNewChat}
                  className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                >
                  Create Team Chat
                </button>
              </div>
            </div>
          )}
        </Flexbox>

        {/* Team Chat Workspace */}
        <TeamChatWorkspace mobile={mobile} />
      </Flexbox>

      {/* Add Member Modal */}
      <AddMemberModal
        open={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        teamId={activeTeamChatId || undefined}
      />

      {/* Team Chat Session Hydration for URL params */}
      <TeamChatSessionHydration />
    </div>
  );
});

TeamChat.displayName = 'TeamChat';

export default TeamChat;
