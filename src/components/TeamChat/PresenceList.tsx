import { Avatar, List, Typography } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { useTeamPresenceStore } from '@/store/teamChat/presence';
import { useUserStore } from '@/store/user';

import { PresenceIndicator } from './PresenceIndicator';

interface PresenceListProps {
  teamId: string;
}

export const PresenceList = memo<PresenceListProps>(({ teamId }) => {
  const { t } = useTranslation('common');
  const presence = useTeamPresenceStore((s) => s.presenceMap[teamId] || {});
  const users = useUserStore((s) => s.users);
  const typingUsers = useTeamPresenceStore((s) => s.typingUsers[teamId] || {});

  const presenceList = Object.entries(presence)
    .map(([userId, data]) => ({
      userId,
      ...data,
      user: users[userId],
      isTyping: typingUsers[userId],
    }))
    .sort((a, b) => {
      // Sort by online status first, then by typing status, then by name
      if (a.isActive !== b.isActive) return b.isActive ? 1 : -1;
      if (a.isTyping !== b.isTyping) return b.isTyping ? 1 : -1;
      return (a.user?.name || a.userId).localeCompare(b.user?.name || b.userId);
    });

  return (
    <List
      size="small"
      dataSource={presenceList}
      renderItem={(item) => (
        <List.Item key={item.userId}>
          <Flexbox horizontal gap={8} align="center">
            <PresenceIndicator teamId={teamId} userId={item.userId} />
            <Typography.Text>
              {item.user?.name || item.userId}
              {item.isTyping && (
                <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                  {t('presence.typing')}
                </Typography.Text>
              )}
            </Typography.Text>
          </Flexbox>
        </List.Item>
      )}
    />
  );
});

PresenceList.displayName = 'PresenceList';
