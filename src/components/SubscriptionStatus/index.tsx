import { Alert, Button, Card, Space, Tag, Typography } from '@lobehub/ui';
import { Crown, Lock, Unlock } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';

const { Text, Title } = Typography;

interface SubscriptionStatusProps {
  showDetails?: boolean;
  className?: string;
}

const SubscriptionStatus = memo<SubscriptionStatusProps>(({ showDetails = true, className }) => {
  const { t } = useTranslation();
  const { hasAccess, subscriptionStatus, planName, reason, isLoading } = useSubscriptionAccess();

  if (isLoading) {
    return (
      <Card className={className}>
        <Space direction="vertical" size="small">
          <Text>Loading subscription status...</Text>
        </Space>
      </Card>
    );
  }

  if (hasAccess) {
    return (
      <Card className={className}>
        <Space direction="vertical" size="small">
          <Space align="center">
            <Unlock size={16} color="green" />
            <Title level={5} style={{ margin: 0 }}>
              Server API Keys Access Granted
            </Title>
          </Space>
          <Space>
            <Tag color="green">Active</Tag>
            {planName && <Tag color="blue">{planName}</Tag>}
            {subscriptionStatus && <Tag color="purple">{subscriptionStatus}</Tag>}
          </Space>
          {showDetails && (
            <Text type="secondary" size="small">
              You have access to all server-side API keys. No need to provide your own keys.
            </Text>
          )}
        </Space>
      </Card>
    );
  }

  return (
    <Alert
      type="warning"
      message={
        <Space direction="vertical" size="small">
          <Space align="center">
            <Lock size={16} />
            <Title level={5} style={{ margin: 0 }}>
              Server API Keys Access Restricted
            </Title>
          </Space>
          <Text type="secondary" size="small">
            {reason || 'Subscription required to access server API keys'}
          </Text>
          {planName && (
            <Text type="secondary" size="small">
              Current plan: <Tag color="orange">{planName}</Tag>
            </Text>
          )}
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<Crown size={14} />}
              onClick={() => window.open('/pricing', '_blank')}
            >
              Subscribe Now
            </Button>
            <Button
              size="small"
              onClick={() => window.open('/settings/api-keys', '_blank')}
            >
              Add Your Own API Keys
            </Button>
          </Space>
        </Space>
      }
      className={className}
    />
  );
});

SubscriptionStatus.displayName = 'SubscriptionStatus';

export default SubscriptionStatus;
