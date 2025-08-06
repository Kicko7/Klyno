import { Avatar, Tooltip } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useUserStore } from '@/store/user';
import { LobeUser } from '@/types/user';

interface ReadReceiptProps {
  messageId: string;
  readers: string[];
  size?: number;
}

export const ReadReceipt = memo<ReadReceiptProps>(({ messageId, readers, size = 24 }) => {
  const { t } = useTranslation('chat');
  const user = useUserStore((s) => s.user) as unknown as Record<string, LobeUser>;

  if (readers.length === 0) return null;

  const readerAvatars = readers.map((userId) => {
    const userData = user?.[userId];
    return {
      userId,
      name: userData?.username || userId,
      avatar: userData?.avatar,
    };
  });

  return (
    <Tooltip
      title={
        <Flexbox gap={8}>
          <div>{t('readReceipts.readBy', { defaultValue: 'Read by' })}</div>
          {readerAvatars.map((reader) => (
            <div key={reader.userId}>{reader.name}</div>
          ))}
        </Flexbox>
      }
    >
      <Flexbox horizontal gap={-8}>
        {readerAvatars.map((reader) => (
          <Avatar
            key={reader.userId}
            size={size}
            src={reader.avatar}
            style={{ border: '2px solid white' }}
          >
            {reader.name[0]}
          </Avatar>
        ))}
      </Flexbox>
    </Tooltip>
  );
});

ReadReceipt.displayName = 'ReadReceipt';
