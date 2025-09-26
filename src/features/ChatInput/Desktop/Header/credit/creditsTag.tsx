'use client';

import { Tooltip } from '@lobehub/ui';
import { TokenTag } from '@lobehub/ui/chat';
import { useTheme } from 'antd-style';
import numeral from 'numeral';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { useOrganizationStore } from '@/store/organization/store';
import { useTeamChatStore } from '@/store/teamChat';
import ActionPopover from './ActionPopover';
import TokenProgress from './TokenProgress';

interface CreditTagProps {
  teamChatId: string;
  organizationSubscriptionInfo?: any;
}

const CreditTag = memo<CreditTagProps>(({ teamChatId, organizationSubscriptionInfo }) => {
  const { t } = useTranslation(['chat', 'components']);
  const theme = useTheme();

  // 1. Credits used in THIS chat
  const totalCreditsUsed = useTeamChatStore(
    (state) => state.chatCreditTotals[teamChatId] || 0
  );
  console.log('Total credits used in chat:', totalCreditsUsed);
  

  // 2. Last AI message credit consumption
  const messages = useTeamChatStore((state) => state.messages[teamChatId] || []);
  const lastAIMessage = [...messages]
    .reverse()
    .find((msg) => msg.messageType === 'assistant');
  const lastMessageCredits = lastAIMessage?.metadata?.credits?.used || 0;

  // 3. Organization credit limits
  const monthlyCredits = organizationSubscriptionInfo?.subscription?.monthlyCredits || 0;
  console.log('Organization monthly credits:', monthlyCredits);
  const remainingCredits = organizationSubscriptionInfo?.subscription?.balance || 0;

  // 4. Calculate total used credits across organization (monthly credits - remaining)
  const totalUsedCredits = Math.max(0, monthlyCredits - remainingCredits);
  console.log('Total used credits (organization-wide):', totalUsedCredits);
  console.log('Remaining credits:', remainingCredits);
  

  // 5. Org name for tooltip
  const { selectedOrganizationId } = useOrganizationStore();
  const orgName = useOrganizationStore(
    (state) => state.organizations.find((org) => org.id === selectedOrganizationId)?.name
  );

  // Avoid division by zero
  const maxValue = monthlyCredits > 0 ? monthlyCredits : 1;

  const content = (
    <Flexbox gap={12} style={{ minWidth: 200 }}>
      {/* Header */}
      <Flexbox align={'center'} gap={4} horizontal justify={'space-between'} width={'100%'}>
        <div style={{ color: theme.colorTextDescription }}>
          {t('creditDetails.title', 'Credit Usage')}
        </div>
        <Tooltip
          styles={{ root: { maxWidth: 'unset', pointerEvents: 'none' } }}
          title={`Monthly credits for ${orgName || 'your organization'}: ${numeral(monthlyCredits).format('0,0.0000')}`}
        >
          <Center
            height={20}
            paddingInline={4}
            style={{
              background: theme.colorFillTertiary,
              borderRadius: 4,
              color: theme.colorTextSecondary,
              fontFamily: theme.fontFamilyCode,
              fontSize: 11,
            }}
          >
            CREDIT
          </Center>
        </Tooltip>
      </Flexbox>

      {/* First Progress Bar: Chat-specific breakdown */}
      <TokenProgress
        data={[
          {
            color: theme.geekblue,
            id: 'lastMessage',
            title: 'Last message',
            value: lastMessageCredits,
          },
          {
            color: theme.gold,
            id: 'chatUsed',
            title: 'Used in chat',
            value: totalCreditsUsed,
          },
        ]}
        showIcon
      />

      {/* Second Progress Bar: Organization-wide usage vs remaining */}
      <TokenProgress
        data={[
          {
            color: theme.colorError,
            id: 'used',
            title: t('creditDetails.used', 'Used'),
            value: totalUsedCredits,
          },
          {
            color: theme.colorSuccess,
            id: 'remaining',
            title: t('creditDetails.remaining', 'Remaining'),
            value: remainingCredits,
          },
        ]}
        showIcon
        showTotal={t('creditDetails.monthlyTotal', 'Monthly Total')}
      />
    </Flexbox>
  );

  return (
    <ActionPopover content={content}>
      <TokenTag
        maxValue={maxValue}
        mode={'used'}
        style={{ marginLeft: 8 }}
        text={{
          overload: t('creditTag.overload', 'Over limit'),
          remained: t('creditTag.remained', 'Remaining'),
          used: t('creditTag.used', 'Used'),
        }}
        value={totalCreditsUsed}
      />
    </ActionPopover>
  );
});

export default CreditTag;