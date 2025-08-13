'use client';

import { Avatar } from '@lobehub/ui';
import { Skeleton } from 'antd';
import { createStyles, useTheme } from 'antd-style';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useOrganizationStore } from '@/store/organization/store';
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

interface TeamMainProps {
  className?: string;
}

const TeamMain = memo<TeamMainProps>(({ className }) => {
  const { t } = useTranslation(['chat']);
  const { styles } = useStyles();
  const theme = useTheme()
  const { organizations } = useOrganizationStore();
  const currentOrganization = organizations?.[0];

  const { teamChatsByOrg, activeTeamChatId, isLoading, currentOrganizationId } = useTeamChatStore();

  // Get chats for current organization
  const teamChats = currentOrganizationId ? teamChatsByOrg[currentOrganizationId] || [] : [];
  const activeTeamChat = teamChats.find((chat) => chat.id === activeTeamChatId);

  // Use team chat title or fallback
  const displayTitle =
    activeTeamChat?.title || `Team Chat - ${currentOrganization?.name || 'Organization'}`;

  if (isLoading)
    return (
      <Flexbox align={'center'} className={className} gap={8} horizontal>
        <Skeleton
          active
          avatar={{ shape: 'circle', size: 28 }}
          paragraph={false}
          title={{ style: { margin: 0, marginTop: 4 }, width: 200 }}
        />
      </Flexbox>
    );

  return (
    <Flexbox align={'center'} className={className} gap={12} horizontal>
      <Avatar avatar={'🤖'} background={'#0066cc'} size={32} title={displayTitle} />
      <Flexbox align={'center'} className={styles.container} gap={8} horizontal>
        <div className={styles.title} style={{  color: theme.appearance === "dark" ? "#fefefe":'#080808'}}>{displayTitle}</div>
      </Flexbox>
    </Flexbox>
  );
});

export default TeamMain;
