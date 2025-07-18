'use client';

import { Suspense } from 'react';
import { useResponsive } from 'antd-style';
import { memo, useEffect, useCallback } from 'react';
import { Flexbox } from 'react-layout-kit';

import { SkeletonList } from '@/features/Conversation';
import ChatHydration from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatHydration';
import ChatInput from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatInput';
import ChatList from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatList';
import ThreadHydration from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ThreadHydration';
import ZenModeToast from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ZenModeToast';
import { useChatStore } from '@/store/chat';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { useOrganizationStore } from '@/store/organization/store';

const TeamChat = memo(() => {
  const { mobile } = useResponsive();
  const { organizations } = useOrganizationStore();
  const currentOrganization = organizations[0];
  
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
            description: `Team conversation for ${currentOrganization?.name || 'organization'}` 
          }
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
          description: `Team conversation for ${currentOrganization?.name || 'organization'}` 
        }
      });
    }
  }, [hasActiveSession, createSession, currentOrganization]);

  return (
    <div className="flex flex-col h-full w-full min-h-[600px] bg-black rounded-lg border border-gray-600/30 overflow-hidden shadow-lg">
      {/* Chat Header */}
      <div className="px-5 py-4 border-b border-gray-600/30 bg-black">
        <h3 className="text-white text-lg font-semibold m-0">
          Team Chat
        </h3>
        <p className="text-gray-400 text-sm mt-1 m-0">
          Chat with your team AI assistant
        </p>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative bg-[#262C33]">
        <ZenModeToast />
        
        <Suspense fallback={<SkeletonList mobile={mobile} />}>
          <ChatList mobile={mobile} />
        </Suspense>
        
        <ChatInput mobile={mobile} onSend={handleSendMessage} />
        <ChatHydration />
        <ThreadHydration />
      </div>
    </div>
  );
});

TeamChat.displayName = 'TeamChat';

export default TeamChat;
