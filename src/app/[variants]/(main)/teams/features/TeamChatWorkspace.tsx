'use client';

import { createStyles } from 'antd-style';
import { Resizable } from 're-resizable';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useTeamChatStore } from '@/store/teamChat';

interface TeamChatWorkspaceProps {
  mobile?: boolean;
}

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    width: 100%;
    border-left: 1px solid ${token.colorBorder};
    background: ${token.colorBgContainer};
  `,
  content: css`
    padding: ${token.paddingLG}px;
    color: ${token.colorText};
  `,
}));

const TeamChatWorkspace = memo<TeamChatWorkspaceProps>(({ mobile }) => {
  const { t } = useTranslation('common');
  const { styles } = useStyles();

  const workspaceConfig = useTeamChatStore((s) => s.workspaceConfig);
  const setWorkspaceWidth = useTeamChatStore((s) => s.setWorkspaceWidth);

  if (!workspaceConfig.isVisible || mobile) return null;

  // Return early if we're server-side
  if (typeof window === 'undefined') {
    return (
      <Flexbox className={styles.container} flex={1} height="100%">
        <Flexbox flex={1} className={styles.content}>
          {t('workspace.title', { defaultValue: 'Team Chat Workspace' })}
        </Flexbox>
      </Flexbox>
    );
  }

  return (
    <Resizable
      enable={{
        left: true,
        right: false,
        top: false,
        bottom: false,
      }}
      minWidth={280}
      maxWidth={800}
      size={{ width: workspaceConfig.width, height: '100%' }}
      onResizeStop={(e, direction, ref, d) => {
        setWorkspaceWidth(workspaceConfig.width + d.width);
      }}
    >
      <Flexbox className={styles.container} flex={1} height="100%">
        <Flexbox flex={1} className={styles.content}>
          {t('workspace.title', { defaultValue: 'Team Chat Workspace' })}
        </Flexbox>
      </Flexbox>
    </Resizable>
  );
});

TeamChatWorkspace.displayName = 'TeamChatWorkspace';

export default TeamChatWorkspace;
