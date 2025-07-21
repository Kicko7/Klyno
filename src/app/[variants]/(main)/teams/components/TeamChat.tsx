'use client';

import { useResponsive } from 'antd-style';
import { Suspense, useState } from 'react';
import { memo, useCallback, useEffect } from 'react';
import { Flexbox } from 'react-layout-kit';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

import ChatHydration from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatHydration';
import ChatInput from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatInput';
import ChatList from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatList';
import ThreadHydration from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ThreadHydration';
import ZenModeToast from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ZenModeToast';
import { SkeletonList } from '@/features/Conversation';
import { useChatStore } from '@/store/chat';
import { useOrganizationStore } from '@/store/organization/store';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';

const TeamChat = memo(() => {
  const { mobile } = useResponsive();
  const { organizations } = useOrganizationStore();
  const currentOrganization = organizations[0];
  const [showMemberModal, setShowMemberModal] = useState(false);

  const activeId = useSessionStore((s) => s.activeId);
  const createSession = useSessionStore((s) => s.createSession);
  const switchSession = useSessionStore((s) => s.switchSession);
  const hasActiveSession = useSessionStore((s) => sessionSelectors.isSomeSessionActive(s));
  const isInboxSession = useSessionStore((s) => sessionSelectors.isInboxSession(s));
  const [inputMessage] = useChatStore((s) => [s.inputMessage]);

  const handleSendMessage = useCallback(async () => {
    // If we're on the inbox session and there's a message, create a new team chat
    if (isInboxSession && inputMessage.trim()) {
      try {
        const newSessionId = await createSession({
          meta: {
            title: 'Team Chat',
            description: `Team conversation for ${currentOrganization?.name || 'organization'}`,
            isTeamChat: true,
            organizationId: currentOrganization?.id,
            teamMembers: [],
          },
        });
        // The createSession function already switches to the new session by default
      } catch (error) {
        console.error('Failed to create new team session:', error);
      }
    }
  }, [isInboxSession, inputMessage, createSession, currentOrganization]);

  // Auto-create session if none exists
  useEffect(() => {
    if (!hasActiveSession) {
      createSession({
        meta: {
          title: 'Team Chat',
          description: `Team conversation for ${currentOrganization?.name || 'organization'}`,
          isTeamChat: true,
          organizationId: currentOrganization?.id,
          teamMembers: [],
        },
      });
    }
  }, [hasActiveSession, createSession, currentOrganization]);

  return (
    <div className="flex flex-col h-full w-full bg-black overflow-hidden relative">
      {/* Add Members Button */}
      <div className="absolute top-2 right-2 z-20">
        <Button
          onClick={() => setShowMemberModal(true)}
          size="sm"
          variant="ghost"
          className="bg-white/10 hover:bg-white/20 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Members
        </Button>
      </div>

      {/* Chat Content - Same layout as main chat */}
      <ZenModeToast />
      
      <Suspense fallback={<SkeletonList mobile={mobile} />}>
        <ChatList mobile={mobile} />
      </Suspense>

      <ChatInput mobile={mobile || false} onSend={handleSendMessage} />
      <ChatHydration />
      <ThreadHydration />
    </div>
  );
});

TeamChat.displayName = 'TeamChat';

export default TeamChat;
