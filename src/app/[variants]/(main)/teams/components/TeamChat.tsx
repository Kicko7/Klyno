'use client';

import { ModelTag } from '@lobehub/icons';
import { ActionIcon } from '@lobehub/ui';
import { ChatHeader } from '@lobehub/ui/chat';
import { useResponsive } from 'antd-style';
import { UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
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

import AddMemberModal from './AddMemberModal';
import TeamChatContent from './TeamChatContent';
import TeamChatHydration from './TeamChatHydration';
import TeamMain from './TeamMain';

const TeamChat = memo(() => {
  const { mobile } = useResponsive();
  const { organizations } = useOrganizationStore();
  const currentOrganization = organizations[0];
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Use dedicated team chat store
  const {
    teamChats,
    activeTeamChatId,
    isLoading,
    createTeamChat,
    loadTeamChats,
    setActiveTeamChat,
  } = useTeamChatStore();

  // Get current model for the model switcher
  const [model, provider] = useAgentStore((s) => [
    agentSelectors.currentAgentModel(s),
    agentSelectors.currentAgentModelProvider(s),
  ]);

  // Initialize team chats when component loads
  useEffect(() => {
    if (currentOrganization?.id) {
      console.log('🔍 Loading team chats for organization:', currentOrganization.id);
      loadTeamChats(currentOrganization.id);
    }
  }, [currentOrganization?.id, loadTeamChats]);

  const searchParams = useSearchParams();
  const chatId = searchParams.get('chatId');

  // Handle chat ID from URL and show welcome page when no chat ID
  useEffect(() => {
    if (chatId) {
      // If chat ID is in URL, set it as active
      console.log('🎯 Setting active team chat from URL:', chatId);
      setActiveTeamChat(chatId);
    } else {
      // If no chat ID in URL, just update the state directly
      console.log('👋 No chat ID in URL, showing welcome page');
      useTeamChatStore.setState({ activeTeamChatId: null });
    }
  }, [chatId, setActiveTeamChat]);

  // Only create first team chat if welcome page is shown and no chats exist
  useEffect(() => {
    if (!chatId && currentOrganization?.id && teamChats.length === 0 && !isLoading) {
      console.log('🚀 No team chats found, creating first one...');
      createTeamChat(currentOrganization.id);
    }
  }, [currentOrganization?.id, teamChats.length, isLoading, createTeamChat, chatId]);

  const handleNewChat = useCallback(async () => {
    if (currentOrganization?.id) {
      console.log('🚀 Creating new team chat...');
      await createTeamChat(currentOrganization.id);
    }
  }, [currentOrganization?.id, createTeamChat]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 TeamChat Debug:', {
      currentOrganization: currentOrganization?.id,
      teamChats: teamChats.length,
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

      {/* Team Chat Content */}
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

      {/* Add Member Modal */}
      <AddMemberModal
        open={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        teamId={activeTeamChatId || undefined}
      />

      {/* Team Chat Hydration for URL params */}
      <TeamChatHydration />
    </div>
  );
});

TeamChat.displayName = 'TeamChat';

export default TeamChat;
