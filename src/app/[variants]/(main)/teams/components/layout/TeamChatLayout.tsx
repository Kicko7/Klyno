'use client';

import { createStyles } from 'antd-style';
import { Suspense, useCallback, useMemo } from 'react';

import DragUpload from '@/components/DragUpload';
import FileList from '@/features/ChatInput/Desktop/FilePreview/FileList';
import { SkeletonList } from '@/features/Conversation';
import { useFileStore } from '@/store/file';
import { useTeamChatStore } from '@/store/teamChat';

import TeamChatInput from '../TeamChatInput';
import TeamChatMessages from '../TeamChatMessages';
import TeamChatHeader from './TeamChatHeader';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    height: 100%;
    display: flex;
    flex-direction: column;
    background: ${token.colorBgLayout};
    overflow: hidden; /* Prevent flex collapse */
  `,
  headerContainer: css`
    flex-shrink: 0;
    border-bottom: 1px solid ${token.colorBorder};
    background: ${token.colorBgContainer};
    z-index: 5;
  `,
  messagesContainer: css`
    flex: 1;
    min-height: 0; /* critical for flex scroll */
    overflow-y: auto;
    scroll-behavior: smooth;
    position: relative;
  `,
  fileListContainer: css`
    flex-shrink: 0;
    background: ${token.colorBgContainer};
    border-top: 1px solid ${token.colorBorder};
    padding: 4px 8px;
    max-height: 150px;
    overflow-y: auto;
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
  isLoading?: boolean;
  isTransitioning?: boolean;
}

const TeamChatLayout = ({
  teamChatId,
  mobile,
  isLoading,
  isTransitioning,
}: TeamChatLayoutProps) => {
  
  const messages = useTeamChatStore(
    useCallback((state) => state.messages[teamChatId] || [], [teamChatId])
  );
  

  const { styles } = useStyles();
  const isLoadingState = isLoading || isTransitioning;

  // Get file store for uploads
  const uploadFiles = useFileStore((s) => s.uploadChatFiles);

  const handleUploadFiles = async (files: File[]) => {
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  return (
    <div className={styles.container}>
      {/* DragUpload for copy-paste and drag-and-drop file uploads */}
      <DragUpload onUploadFiles={handleUploadFiles} />
      
      {/* Fixed Header */}
      <div className={styles.headerContainer}>
        <TeamChatHeader teamChatId={teamChatId} />
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        <Suspense fallback={<SkeletonList mobile={mobile} />}>
          <TeamChatMessages messages={messages} isLoading={isLoadingState} />
        </Suspense>
      </div>

      {/* File List */}
      <div className={styles.fileListContainer}>
        <FileList />
      </div>

      {/* Chat Input */}
      <div className={styles.inputContainer}>
        <TeamChatInput teamChatId={teamChatId} />
      </div>
    </div>
  );
};

export default TeamChatLayout;
