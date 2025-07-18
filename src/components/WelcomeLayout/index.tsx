'use client';

import { memo, useCallback } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useChatStore } from '@/store/chat';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';

import WelcomeScreen from '../WelcomeScreen';
import ChatInput from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatInput';
import ChatList from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatList';

interface WelcomeLayoutProps {
  mobile?: boolean;
}

const WelcomeLayout = memo<WelcomeLayoutProps>(({ mobile }) => {
  const activeId = useSessionStore((s) => s.activeId);
  const createSession = useSessionStore((s) => s.createSession);
  const switchSession = useSessionStore((s) => s.switchSession);
  const hasActiveSession = useSessionStore((s) => sessionSelectors.isSomeSessionActive(s));
  const isInboxSession = useSessionStore((s) => sessionSelectors.isInboxSession(s));
  const [inputMessage] = useChatStore((s) => [s.inputMessage]);

  const handleSendMessage = useCallback(async () => {
    // If we're on the inbox session and there's a message, create a new private chat
    if (isInboxSession && inputMessage.trim()) {
      try {
        const newSessionId = await createSession({
          meta: { 
            title: 'New Chat',
            description: 'Private chat session' 
          }
        });
        // The createSession function already switches to the new session by default
        // so we don't need to call switchSession manually
      } catch (error) {
        console.error('Failed to create new session:', error);
      }
    }
  }, [isInboxSession, inputMessage, createSession]);

  // Show welcome screen if we're on the inbox session or no active session
  const showWelcomeScreen = !hasActiveSession || isInboxSession;

  return (
    <Flexbox height="100%" style={{ overflow: 'hidden' }}>
      {showWelcomeScreen ? (
        <Flexbox flex={1} height="100%">
          <WelcomeScreen />
        </Flexbox>
      ) : (
        <Flexbox flex={1} height="100%">
          <ChatList mobile={mobile} />
        </Flexbox>
      )}
      <ChatInput mobile={mobile} onSend={handleSendMessage} />
    </Flexbox>
  );
});

WelcomeLayout.displayName = 'WelcomeLayout';

export default WelcomeLayout;
