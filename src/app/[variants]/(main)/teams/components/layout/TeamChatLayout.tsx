'use client';

import { Suspense } from 'react';
import { Flexbox } from 'react-layout-kit';
import { createStyles } from 'antd-style';

import TeamChatHeader from './TeamChatHeader';
import TeamChatList from '../TeamChatMessages';
import TeamChatInput from '../TeamChatInput';
import { useTeamChatStore } from '@/store/teamChat';
import { SkeletonList } from '@/features/Conversation';

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
    padding: 16px;
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
            <TeamChatList
              messages={messages[teamChatId] || []}
              isLoading={isLoadingMessages}
            />
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
