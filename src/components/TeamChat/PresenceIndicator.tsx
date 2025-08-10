import { Avatar, Badge, Tooltip } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center } from 'react-layout-kit';

import { useTeamPresenceStore } from '@/store/teamChat/presence';
import { useUserStore } from '@/store/user';

interface PresenceIndicatorProps {
  teamId: string;
  userId: string;
  showAvatar?: boolean;
  size?: number;
}

export const PresenceIndicator = memo<PresenceIndicatorProps>(
  ({ teamId, userId, showAvatar = true, size = 24 }) => {
    const { t } = useTranslation('common');
    const presence = useTeamPresenceStore((s) => s.presenceMap[teamId]?.[userId]);
    const user = useUserStore((s) => s.users[userId]);
    const isTyping = useTeamPresenceStore((s) => s.typingUsers[teamId]?.[userId]);

    if (!presence) return null;

    const status = presence.isActive ? 'success' : 'default';
    const statusText = presence.isActive ? t('presence.online') : t('presence.offline');
    const typingText = isTyping ? t('presence.typing') : undefined;

    const indicator = (
      <Badge
        status={status}
        title={typingText || statusText}
        style={{ marginRight: showAvatar ? 8 : 0 }}
      />
    );

    if (!showAvatar) return indicator;

    return (
      <Tooltip title={`${user?.name || userId} - ${typingText || statusText}`}>
        <Center>
          {indicator}
          <Avatar size={size} src={user?.avatar}>
            {user?.name?.[0] || userId[0]}
          </Avatar>
        </Center>
      </Tooltip>
    );
  },
);

PresenceIndicator.displayName = 'PresenceIndicator';
