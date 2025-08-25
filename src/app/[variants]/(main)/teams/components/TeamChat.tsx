'use client';

import { ModelTag } from '@lobehub/icons';
import { ActionIcon, Avatar, Tag, Tooltip } from '@lobehub/ui';
import { ChatHeader } from '@lobehub/ui/chat';
import { Alert, Button } from 'antd';
import { useResponsive, useTheme } from 'antd-style';
import { UserPlus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { memo, useCallback, useEffect, useMemo } from 'react';
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
    setActiveTeamChat,
    currentOrganizationId,
    error,
    refreshTeamChats,
    refreshSidebar,
  } = useTeamChatStore();

  // Get chats for current organization
  const teamChats = currentOrganization?.id ? teamChatsByOrg[currentOrganization.id] || [] : [];

  // Get current model for the model switcher
  const [model, provider] = useAgentStore((s) => [
    agentSelectors.currentAgentModel(s),
    agentSelectors.currentAgentModelProvider(s),
  ]);

  useEffect(() => {
    if (currentOrganization?.id && currentOrganization.id !== currentOrganizationId) {
      console.log('🔄 Organization changed, loading team chats:', currentOrganization.id);
      refreshTeamChats();
    }
  }, [currentOrganization?.id, currentOrganizationId]); // Remove refreshTeamChats

  // Validate chat access and sync with URL
  useEffect(() => {
    // Wait for everything to be loaded before validating
    if (!chatId || !currentOrganization?.id || isLoading || teamChats.length === 0) return;

    // Find the chat in current organization's chats
    const chat = teamChats.find((c) => c.id === chatId);

    // If we have chats loaded and can't find this chat, it might be invalid
    if (!chat) {
      console.warn('⚠️ Chat not found in current organization:', chatId);
      setActiveTeamChat(null);
      router.push('/teams');
      return;
    }

    // If we found the chat and it's not already active, set it
    if (activeTeamChatId !== chatId) {
      console.log('🔍 Setting active chat from URL:', chatId);
      setActiveTeamChat(chatId);
    }
  }, [
    chatId,
    currentOrganization?.id,
    isLoading,
    activeTeamChatId,
    teamChats.length, // Only depend on length, not the full array
    router,
    selectedOrganizationId,
  ]);
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

  // Get active users from store (updated via WebSocket) - Fixed to return stable reference
  const activeUsers = useTeamChatStore((state) => {
    const chatState = state.activeChatStates[activeTeamChatId || ''];
    return chatState?.presence || null;
  });

  // Memoize active users to prevent infinite re-renders
  // const memoizedActiveUsers = useMemo(() => {
  //   return activeUsers || {};
  // }, [activeUsers]);

  // Presence is now handled by WebSocket in useTeamChatWebSocket hook

  // Debug logging

  const theme = useTheme();
  return (
    <div
      className={`flex flex-col h-full w-full ${theme.appearance === 'dark' ? 'bg-black' : 'bg-white'} relative`}
    >
      {/* Team Chat Header */}
      <ChatHeader
        left={
          <Flexbox align={'center'} gap={12} horizontal>
            <TeamMain />
            {activeTeamChatId && (
              <Flexbox gap={8} horizontal>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: isLoading ? '#666' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {/* {teamChats.find((chat) => chat.id === activeTeamChatId)?.title ||
                    'Loading chat...'} */}
                  {isLoading && <span className="animate-pulse">•••</span>}
                </div>
              </Flexbox>
            )}
            {/* <ModelSwitchPanel
              sessionId={
                teamChats.find((chat) => chat.id === activeTeamChatId)?.metadata?.sessionId
              }
            >
              <ModelTag model={model} />
            </ModelSwitchPanel> */}
            {/* {Object.keys(memoizedActiveUsers).length > 0 && !isLoading && (
              <Flexbox gap={8} horizontal style={{ marginLeft: 12 }}>
                {Object.entries(memoizedActiveUsers)
                  .slice(0, 3)
                  .map(([userId, userData]) => (
                    <Tooltip
                      key={userId}
                      title={`${userData.username || 'User'} (Active)`}
                      placement="bottom"
                    >
                      <Avatar
                        avatar={userData.avatar}
                        size={24}
                        style={{
                          border: '2px solid #4CAF50',
                          boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.2)',
                        }}
                      />
                    </Tooltip>
                  ))}
                {Object.keys(memoizedActiveUsers).length > 3 && (
                  <Tag>+{Object.keys(memoizedActiveUsers).length - 3} active</Tag>
                )}
              </Flexbox>
            )} */}
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
          {error && (
            <div className="p-4">
              <Alert
                type="error"
                message={error}
                showIcon
                closable
                onClose={() => useTeamChatStore.setState({ error: null })}
                action={
                  <Button
                    size="small"
                    onClick={() => {
                      useTeamChatStore.setState({ error: null });
                      router.push('/teams');
                    }}
                  >
                    Go to Teams
                  </Button>
                }
              />
            </div>
          )}
          {isLoading || !activeTeamChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <SkeletonList mobile={mobile} />
              {activeTeamChatId && <div className="mt-4 text-slate-400">Loading chat...</div>}
            </div>
          ) : activeTeamChatId ? (
            <Suspense
              fallback={
                <div className="flex-1 flex flex-col items-center justify-center">
                  <SkeletonList mobile={mobile} />
                  <div className="mt-4 text-slate-400">Loading messages...</div>
                </div>
              }
            >
              <TeamChatContent
                key={activeTeamChatId} // Force remount on chat switch
                teamChatId={activeTeamChatId}
                mobile={mobile || false}
                onNewChat={handleNewChat}
              />
            </Suspense>
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
