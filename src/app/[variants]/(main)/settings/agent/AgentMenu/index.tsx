'use client';

import { Alert } from '@lobehub/ui';
import { useTheme } from 'antd-style';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import { useSearchParams, useRouter } from 'next/navigation';

import { AgentCategory } from '@/features/AgentSetting';

interface ProviderMenuProps {
  mobile?: boolean;
}
const ProviderMenu = memo(({ mobile }: ProviderMenuProps) => {
  const theme = useTheme();
  const { t } = useTranslation('setting');
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab') || '';
  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('tab', value);
    } else {
      params.delete('tab');
    }
    router.replace(`?${params.toString()}`);
  };

  const width = mobile ? undefined : 260;
  return (
    <Flexbox
      gap={24}
      paddingBlock={28}
      paddingInline={12}
      style={{
        background: theme.colorBgLayout,
        borderRight: `1px solid ${theme.colorBorderSecondary}`,
        minWidth: width,
        overflow: mobile ? undefined : 'scroll',
      }}
      width={width}
    >
      <Alert
        message={t('systemAgent.helpInfo')}
        style={{
          borderRadius: theme.borderRadius,
        }}
        variant={'filled'}
      />
      <AgentCategory setTab={setTab} tab={tab} />
    </Flexbox>
  );
});

export default ProviderMenu;
