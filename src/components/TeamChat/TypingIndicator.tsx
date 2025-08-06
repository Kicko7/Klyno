import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useUserStore } from '@/store/user';
import { useTypingIndicatorStyles } from '@/styles/typing-indicator';
import { LobeUser } from '@/types/user';

interface TypingIndicatorProps {
  teamId: string;
  typingUsers: string[];
}

export const TypingIndicator = memo<TypingIndicatorProps>(({ teamId, typingUsers }) => {
  const { t } = useTranslation('chat');
  const { styles } = useTypingIndicatorStyles();
  const user = useUserStore((s) => s.user) as unknown as Record<string, LobeUser>;

  if (typingUsers.length === 0) return null;

  const typingNames = typingUsers
    .map((userId) => {
      const userData = user?.[userId];
      return userData?.username || userId;
    })
    .filter(Boolean);

  if (typingNames.length === 0) return null;

  let message: string;
  if (typingNames.length === 1) {
    message = `${typingNames[0]} ${t('typing.isTyping', 'is typing...')}`;
  } else if (typingNames.length === 2) {
    message = `${typingNames[0]} ${t('typing.and', 'and')} ${typingNames[1]} ${t(
      'typing.areTyping',
      'are typing...',
    )}`;
  } else {
    message = `${typingNames[0]}, ${typingNames[1]} ${t('typing.and', 'and')} ${
      typingNames.length - 2
    } ${t('typing.othersAreTyping', 'others are typing...')}`;
  }

  return (
    <Flexbox gap={4} style={{ color: 'var(--ant-color-text-secondary)' }}>
      <div className={styles.indicator}>
        <span />
        <span />
        <span />
      </div>
      <div>{message}</div>
    </Flexbox>
  );
});

TypingIndicator.displayName = 'TypingIndicator';
