'use client';

import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Flexbox, FlexboxProps } from 'react-layout-kit';

import PlanTag from '@/features/User/PlanTag';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useUserStore } from '@/store/user';
import { authSelectors, userProfileSelectors } from '@/store/user/selectors';

import UserAvatar, { type UserAvatarProps } from './UserAvatar';

const useStyles = createStyles(({ css, token }) => ({
  nickname: css`
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
  `,
  username: css`
    line-height: 1;
    color: ${token.colorTextDescription};
  `,
  creditsContainer: css`
    margin-top: 8px;
    padding: 8px 12px;
    background: ${token.colorFillTertiary};
    border-radius: 8px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  creditsAmount: css`
    font-weight: 600;
    color: ${token.colorPrimary};
  `,
}));

export interface UserInfoProps extends FlexboxProps {
  avatarProps?: Partial<UserAvatarProps>;
  onClick?: () => void;
}

// Credits display component
const CreditsDisplay = memo(() => {
  const { styles, theme } = useStyles();
  const { subscriptionInfo, hasActiveSubscription } = useUserSubscription();

  if (!hasActiveSubscription || !subscriptionInfo?.currentCredits) {
    return null;
  }

  const formatCredits = (credits: number) => {
    if (credits >= 1_000_000) {
      return `${(credits / 1_000_000).toFixed(1)}M`;
    } else if (credits >= 1_000) {
      return `${(credits / 1_000).toFixed(1)}K`;
    }
    return credits.toString();
  };

  return (
    <div className={styles.creditsContainer}>
      <div>Credits Available</div>
      <div className={styles.creditsAmount}>{formatCredits(subscriptionInfo.currentCredits)}</div>
    </div>
  );
});

CreditsDisplay.displayName = 'CreditsDisplay';

const UserInfo = memo<UserInfoProps>(({ avatarProps, onClick, ...rest }) => {
  const { styles, theme } = useStyles();
  const isSignedIn = useUserStore(authSelectors.isLogin);
  const [nickname, username] = useUserStore((s) => [
    userProfileSelectors.nickName(s),
    userProfileSelectors.username(s),
  ]);

  return (
    <Flexbox
      align={'center'}
      gap={12}
      horizontal
      justify={'space-between'}
      paddingBlock={12}
      paddingInline={12}
      {...rest}
    >
      <Flexbox align={'center'} gap={12} horizontal onClick={onClick}>
        <UserAvatar background={theme.colorFill} size={48} {...avatarProps} />
        <Flexbox flex={1} gap={6}>
          <div className={styles.nickname}>{nickname}</div>
          <div className={styles.username}>{username}</div>
        </Flexbox>
      </Flexbox>
      <Flexbox gap={4} direction="vertical">
        {isSignedIn && <PlanTag />}
        <CreditsDisplay />
      </Flexbox>
    </Flexbox>
  );
});

export default UserInfo;
