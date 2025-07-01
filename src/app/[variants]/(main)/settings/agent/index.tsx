'use client';

import { Tabs } from '@lobehub/ui';
import { Skeleton } from 'antd';
import { useTheme } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { useSearchParams, useRouter } from 'next/navigation';
import { memo } from 'react';

import { INBOX_SESSION_ID } from '@/const/session';
import { AgentSettings } from '@/features/AgentSetting';
import { useCategory } from '@/features/AgentSetting/AgentCategory/useCategory';
import { ChatSettingsTabs } from '@/store/global/initialState';
import { useServerConfigStore } from '@/store/serverConfig';
import { useUserStore } from '@/store/user';
import { settingsSelectors } from '@/store/user/selectors';

const Page = memo(() => {
  const cateItems = useCategory();
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
  const config = useUserStore(settingsSelectors.defaultAgentConfig, isEqual);
  const meta = useUserStore(settingsSelectors.defaultAgentMeta, isEqual);
  const [updateAgent, isUserStateInit] = useUserStore((s) => [
    s.updateDefaultAgent,
    s.isUserStateInit,
  ]);

  const theme = useTheme();
  const mobile = useServerConfigStore((s) => s.isMobile);

  if (!isUserStateInit) return <Skeleton active paragraph={{ rows: 5 }} title={false} />;

  return (
    <>
      {mobile && (
        <Tabs
          activeKey={tab}
          compact
          items={cateItems?.filter(Boolean) as any}
          onChange={(value) => setTab(value as ChatSettingsTabs)}
          style={{
            borderBottom: `1px solid ${theme.colorBorderSecondary}`,
          }}
        />
      )}
      <AgentSettings
        config={config}
        id={INBOX_SESSION_ID}
        loading={!isUserStateInit}
        meta={meta}
        onConfigChange={(config) => {
          updateAgent({ config });
        }}
        onMetaChange={(meta) => {
          updateAgent({ meta });
        }}
        tab={tab as ChatSettingsTabs}
      />
    </>
  );
});

Page.displayName = 'AgentSetting';

export default Page;
