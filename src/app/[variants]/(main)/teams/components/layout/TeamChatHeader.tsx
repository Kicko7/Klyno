'use client';

import { Avatar } from '@lobehub/ui';
import { ChatHeader } from '@lobehub/ui/chat';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';
import { sessionMetaSelectors } from '@/store/session/slices/session/selectors';
import { useTeamChatStore } from '@/store/teamChat';

const useStyles = createStyles(({ css }) => ({
  container: css`
    position: relative;
    overflow: hidden;
    flex: 1;
    max-width: 100%;
  `,
  title: css`
    overflow: hidden;

    font-size: 14px;
    font-weight: bold;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

interface TeamChatHeaderProps {
  teamChatId: string;
}

const TeamChatHeader = memo<TeamChatHeaderProps>(({ teamChatId }) => {
  const { t } = useTranslation('chat');
  const { styles } = useStyles();
  
  const { teamChats, activeTeamChatId } = useTeamChatStore();
  const currentChat = teamChats.find(chat => chat.id === teamChatId);
  const agentMeta = useSessionStore(sessionMetaSelectors.currentAgentMeta);
  const showHeader = useGlobalStore(systemStatusSelectors.showChatHeader);

  if (!showHeader) return null;

  if (!currentChat) {
    return (
      <ChatHeader
        left={
          <Flexbox align={'center'} gap={8} horizontal>
            <Skeleton
              active
              avatar={{ shape: 'circle', size: 28 }}
              paragraph={false}
              title={{ style: { margin: 0, marginTop: 4 }, width: 200 }}
            />
          </Flexbox>
        }
        style={{ paddingInline: 8, position: 'initial', zIndex: 11 }}
      />
    );
  }

  return (
    <ChatHeader
      left={
        <Flexbox align={'center'} gap={12} horizontal>
          <Avatar
            avatar={agentMeta.avatar}
            background={agentMeta.backgroundColor}
            size={32}
            title={agentMeta.title || 'AI Assistant'}
          />
          <Flexbox align={'center'} className={styles.container} gap={8} horizontal>
            <div className={styles.title}>
              {currentChat.title || 'Team AI Chat'}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280',
              padding: '2px 6px',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '4px',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}>
              🤖 AI Chat
            </div>
          </Flexbox>
        </Flexbox>
      }
      right={
        <Flexbox align={'center'} gap={8} horizontal>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            padding: '4px 8px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            Team Chat
          </div>
        </Flexbox>
      }
      style={{ paddingInline: 8, position: 'initial', zIndex: 11 }}
    />
  );
});

TeamChatHeader.displayName = 'TeamChatHeader';

export default TeamChatHeader;
