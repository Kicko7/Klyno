import { ActionIcon, ActionIconProps } from '@lobehub/ui';
import { FolderClosed, Lock, MessageSquare, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useGlobalStore } from '@/store/global';
import { SidebarTabKey } from '@/store/global/initialState';
import { useOrganizationStore } from '@/store/organization/store';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useSessionStore } from '@/store/session';
import { useTeamChatStore } from '@/store/teamChat';

const ICON_SIZE: ActionIconProps['size'] = {
  blockSize: 40,
  size: 24,
  strokeWidth: 2,
};

export interface TopActionProps {
  isPinned?: boolean | null;
  tab?: SidebarTabKey;
}

const TopActions = memo<TopActionProps>(({ tab, isPinned }) => {
  const { t } = useTranslation('common');
  const switchBackToChat = useGlobalStore((s) => s.switchBackToChat);
  const { showMarket, enableKnowledgeBase } = useServerConfigStore(featureFlagsSelectors);
  const { subscriptionInfo } = useUserSubscription();

  // Get organization data
  const { organizations, fetchOrganizations } = useOrganizationStore();

  const isChatActive = tab === SidebarTabKey.Chat && !isPinned;
  const isFilesActive = tab === SidebarTabKey.Files;
  const isTeamsActive = tab === SidebarTabKey.Teams;
  const isDiscoverActive = tab === SidebarTabKey.Discover;

  const setActiveTeamChat = useTeamChatStore((state) => state.setActiveTeamChat);

  const isUserHasSubscription =
    subscriptionInfo?.subscription?.status === 'active' &&
    subscriptionInfo?.subscription?.planName !== 'Starter' &&
    subscriptionInfo?.subscription?.planName !== 'Creator Pro';

  const isUserUnlocked = isUserHasSubscription || organizations.length > 0;
  const isTeamsLocked = !isUserUnlocked;

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <Flexbox gap={8}>
      <Link
        aria-label={t('tab.chat')}
        href={'/chat'}
        onClick={(e) => {
          // If Cmd key is pressed, let the default link behavior happen (open in new tab)
          if (e.metaKey || e.ctrlKey) {
            return;
          }
          setActiveTeamChat(null);
          // Otherwise, prevent default and switch session within the current tab
          e.preventDefault();
          switchBackToChat(useSessionStore.getState().activeId);
        }}
      >
        <ActionIcon
          active={isChatActive}
          icon={MessageSquare}
          size={ICON_SIZE}
          title={t('tab.chat')}
          tooltipProps={{ placement: 'right' }}
        />
      </Link>
      <Link aria-label="Teams" href={isTeamsLocked ? '#' : '/teams'}>
        <ActionIcon
          active={isTeamsActive && !isTeamsLocked}
          disabled={isTeamsLocked}
          icon={isTeamsLocked ? Lock : Users}
          size={ICON_SIZE}
          title={isTeamsLocked ? 'Teams (Premium Required)' : 'Teams'}
          tooltipProps={{ placement: 'right' }}
          onClick={(e) => {
            if (isTeamsLocked) {
              e.preventDefault();
              return;
            }
            setActiveTeamChat(null);
          }}
        />
      </Link>
      {enableKnowledgeBase && (
        <Link aria-label={t('tab.files')} href={'/files'}>
          <ActionIcon
            active={isFilesActive}
            icon={FolderClosed}
            size={ICON_SIZE}
            title={t('tab.files')}
            tooltipProps={{ placement: 'right' }}
            onClick={() => {
              setActiveTeamChat(null);
            }}
          />
        </Link>
      )}

      {showMarket && (
        <Link aria-label={t('tab.discover')} href={'/discover'}>
          <ActionIcon
            active={isDiscoverActive}
            icon={Search}
            size={ICON_SIZE}
            title={t('tab.discover')}
            tooltipProps={{ placement: 'right' }}
            onClick={() => {
              setActiveTeamChat(null);
            }}
          />
        </Link>
      )}
    </Flexbox>
  );
});

export default TopActions;
