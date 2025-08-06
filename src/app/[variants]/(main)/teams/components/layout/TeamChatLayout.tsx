'use client';

import { createStyles } from 'antd-style';
import { Suspense, useMemo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { SkeletonList } from '@/features/Conversation';
import { useTeamChatStore } from '@/store/teamChat';

import TeamChatInput from '../TeamChatInput';
import TeamChatList from '../TeamChatMessages';
import TeamChatHeader from './TeamChatHeader';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    height: 100%;
    display: flex;
    flex-direction: column;
    background: ${token.colorBgLayout};
  `,
  messagesContainer: css`
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
    position: relative;
    min-height: 0; /* Critical for flexbox scrolling */
  `,
  inputContainer: css`
    flex-shrink: 0;
    position: relative;
    z-index: 10;
    background: ${token.colorBgContainer};
    border-top: 1px solid ${token.colorBorder};
  `,
}));

interface TeamChatLayoutProps {
  teamChatId: string;
  mobile?: boolean;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoading?: boolean;
  isTransitioning?: boolean;
}

const TeamChatLayout = ({
  teamChatId,
  mobile,
  onLoadMore,
  hasMore,
  isLoading,
  isTransitioning,
}: TeamChatLayoutProps) => {
  // Get messages from store with stable reference
  const messages = useTeamChatStore((state) => {
    const chatMessages = state.messages[teamChatId];
    return chatMessages || null;
  });

  // Memoize messages to prevent infinite re-renders
  const memoizedMessages = useMemo(() => {
    return messages || [];
  }, [messages]);

  const { styles } = useStyles();

  // Combine loading states
  const isLoadingState = isLoading || isTransitioning;

  return (
    <>
      <TeamChatHeader teamChatId={teamChatId} />
      <div className={styles.container}>
        <div className={styles.messagesContainer}>
          <Suspense fallback={<SkeletonList mobile={mobile} />}>
            <TeamChatList messages={memoizedMessages} isLoading={isLoadingState} />
          </Suspense>
        </div>

        <div className={styles.inputContainer}>
          <TeamChatInput teamChatId={teamChatId} />
        </div>
      </div>
    </>
  );
};

export default TeamChatLayout;
