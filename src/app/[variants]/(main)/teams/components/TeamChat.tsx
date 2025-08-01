'use client';

import { useResponsive } from 'antd-style';
import { Suspense, useState } from 'react';
import { memo, useCallback, useEffect } from 'react';
import { Flexbox } from 'react-layout-kit';
import { ActionIcon } from '@lobehub/ui';
import { UserPlus } from 'lucide-react';
import { DESKTOP_HEADER_ICON_SIZE } from '@/const/layoutTokens';

import { SkeletonList } from '@/features/Conversation';
import { useOrganizationStore } from '@/store/organization/store';
import { useTeamChatStore } from '@/store/teamChat';
import { ChatHeader } from '@lobehub/ui/chat';
import TeamMain from './TeamMain';
import HeaderAction from '@/app/[variants]/(main)/chat/(workspace)/_layout/Desktop/ChatHeader/HeaderAction';
import ModelSwitchPanel from '@/features/ModelSwitchPanel';
import { ModelTag } from '@lobehub/icons';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import AddMemberModal from './AddMemberModal';
import TeamChatContent from './TeamChatContent';
import TeamChatHydration from './TeamChatHydration';

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
  
  // Auto-create first team chat if none exists
  useEffect(() => {
    if (currentOrganization?.id && teamChats.length === 0 && !isLoading) {
      console.log('🚀 No team chats found, creating first one...');
      createTeamChat(currentOrganization.id);
    }
  }, [currentOrganization?.id, teamChats.length, isLoading, createTeamChat]);

  // Set active chat to first available if none selected
  useEffect(() => {
    if (teamChats.length > 0 && !activeTeamChatId) {
      console.log('🎯 Setting active team chat to first available:', teamChats[0].id);
      setActiveTeamChat(teamChats[0].id);
    }
  }, [teamChats, activeTeamChatId, setActiveTeamChat]);

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
