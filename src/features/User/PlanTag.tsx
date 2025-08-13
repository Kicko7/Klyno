import { Tag, Tooltip } from '@lobehub/ui';
import { useTheme } from 'antd-style';
import { CSSProperties, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useUserSubscription } from '@/hooks/useUserSubscription';

export enum PlanType {
  Preview = 'preview',
}

export interface PlanTagProps {
  type?: PlanType;
}

const PlanTag = memo<PlanTagProps>(({ type = PlanType.Preview }) => {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const { subscriptionInfo, hasActiveSubscription, currentPlan } = useUserSubscription();

  const tag: {
    desc: string;
    style: CSSProperties;
    title: string;
  } = useMemo(() => {
    // If user has an active subscription, show plan info
    if (hasActiveSubscription && subscriptionInfo?.subscription) {
      const subscription = subscriptionInfo.subscription;
      const currentCredits = subscriptionInfo.currentCredits;

      return {
        desc: `${subscription.planName} - ${currentCredits.toLocaleString()} credits available`,
        style: {
          background: theme.colorPrimary,
          color: 'white',
        },
        title: subscription.planName,
      };
    }

    // Default community plan
    return {
      desc: t('userPanel.community'),
      style: {
        background: theme.colorFill,
      },
      title: 'Community',
    };
  }, [hasActiveSubscription, subscriptionInfo, theme.colorPrimary, theme.colorFill, t]);

  return (
    <Tooltip title={tag.desc}>
      <Tag bordered={false} style={{ ...tag.style, borderRadius: 12, cursor: 'pointer' }}>
        {tag.title}
      </Tag>
    </Tooltip>
  );
});

export default PlanTag;
