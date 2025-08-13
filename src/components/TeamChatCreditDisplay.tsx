import { CreditCardOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Statistic, Tooltip } from 'antd';
import { useTheme } from 'antd-style';
import React, { useEffect } from 'react';

import { useTeamChatCreditTracking } from '@/hooks/useTeamChatCreditTracking';
import { useUserStore } from '@/store/user';

interface TeamChatCreditDisplayProps {
  teamChatId?: string;
  showRefreshButton?: boolean;
  compact?: boolean;
}

export const TeamChatCreditDisplay: React.FC<TeamChatCreditDisplayProps> = ({
  teamChatId,
  showRefreshButton = true,
  compact = false,
}) => {
  const theme = useTheme();
  const { user } = useUserStore();

  const {
    totalCreditsConsumed,
    teamChatCreditsConsumed,
    isLoading,
    error,
    fetchTotalCreditsConsumed,
    fetchTeamChatCreditsConsumed,
    refreshCredits,
  } = useTeamChatCreditTracking(user?.id || '', teamChatId);

  // Fetch credit data on mount and when teamChatId changes
  useEffect(() => {
    if (user?.id) {
      fetchTotalCreditsConsumed();
      if (teamChatId) {
        fetchTeamChatCreditsConsumed();
      }
    }
  }, [user?.id, teamChatId, fetchTotalCreditsConsumed, fetchTeamChatCreditsConsumed]);

  if (!user?.id) {
    return null;
  }

  const handleRefresh = () => {
    refreshCredits();
  };

  if (compact) {
    return (
      <Tooltip
        title={
          <div>
            <div>Total Credits: {totalCreditsConsumed}</div>
            {teamChatId && <div>Team Chat Credits: {teamChatCreditsConsumed}</div>}
          </div>
        }
        placement="top"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.marginXS }}>
          <CreditCardOutlined style={{ color: theme.colorTextSecondary }} />
          <span style={{ fontSize: theme.fontSizeSM, color: theme.colorTextSecondary }}>
            {teamChatId ? teamChatCreditsConsumed : totalCreditsConsumed} credits
          </span>
          {showRefreshButton && (
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isLoading}
              style={{ padding: 0, height: 'auto' }}
            />
          )}
        </div>
      </Tooltip>
    );
  }

  return (
    <Card
      size="small"
      style={{
        marginBottom: theme.marginSM,
        backgroundColor: theme.colorBgContainer,
        border: `1px solid ${theme.colorBorder}`,
      }}
      bodyStyle={{ padding: theme.paddingSM }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.marginSM }}>
          <CreditCardOutlined style={{ color: theme.colorPrimary, fontSize: theme.fontSizeLG }} />
          <div>
            <div
              style={{
                fontSize: theme.fontSizeSM,
                color: theme.colorTextSecondary,
                marginBottom: theme.marginXS,
              }}
            >
              Credit Usage
              <Tooltip title="Credits are consumed when AI generates responses. 100 tokens = 1 credit">
                <InfoCircleOutlined
                  style={{ marginLeft: theme.marginXS, color: theme.colorTextTertiary }}
                />
              </Tooltip>
            </div>
            <div style={{ display: 'flex', gap: theme.marginLG }}>
              <Statistic
                title="Total"
                value={totalCreditsConsumed}
                valueStyle={{ fontSize: theme.fontSizeLG, fontWeight: theme.fontWeightStrong }}
                suffix="credits"
              />
              {teamChatId && (
                <Statistic
                  title="This Chat"
                  value={teamChatCreditsConsumed}
                  valueStyle={{ fontSize: theme.fontSizeLG, fontWeight: theme.fontWeightStrong }}
                  suffix="credits"
                />
              )}
            </div>
          </div>
        </div>

        {showRefreshButton && (
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={isLoading}
          >
            Refresh
          </Button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: theme.marginSM,
            color: theme.colorError,
            fontSize: theme.fontSizeSM,
          }}
        >
          Error: {error}
        </div>
      )}
    </Card>
  );
};
