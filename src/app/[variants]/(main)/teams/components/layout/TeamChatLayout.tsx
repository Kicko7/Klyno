'use client';

import { createStyles } from 'antd-style';
import { Suspense } from 'react';
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
}

const TeamChatLayout = ({ teamChatId, mobile }: TeamChatLayoutProps) => {
  const { messages, isLoadingMessages } = useTeamChatStore();
  const { styles } = useStyles();

  return (
    <>
      <TeamChatHeader teamChatId={teamChatId} />
      <div className={styles.container}>
        <div className={styles.messagesContainer}>
          <Suspense fallback={<SkeletonList mobile={mobile} />}>
            <TeamChatList messages={messages[teamChatId] || []} isLoading={isLoadingMessages} />
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
