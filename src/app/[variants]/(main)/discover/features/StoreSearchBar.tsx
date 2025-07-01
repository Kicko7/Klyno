'use client';

import { SearchBar, SearchBarProps } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import urlJoin from 'url-join';

import { withSuspense } from '@/components/withSuspense';
import { useQueryRoute } from '@/hooks/useQueryRoute';
import { useUserStore } from '@/store/user';
import { settingsSelectors } from '@/store/user/selectors';
import { DiscoverTab } from '@/types/discover';
import { HotkeyEnum } from '@/types/hotkey';

import { useNav } from './useNav';

export const useStyles = createStyles(({ css, prefixCls, token }) => ({
  active: css`
    box-shadow: ${token.boxShadow};
  `,
  bar: css`
    .${prefixCls}-input-group-wrapper {
      padding: 0;
    }
  `,
}));

interface StoreSearchBarProps extends SearchBarProps {
  mobile?: boolean;
}

const StoreSearchBar = memo<StoreSearchBarProps>(({ mobile, onBlur, onFocus, ...rest }) => {
  const [active, setActive] = useState(false);
  const pathname = usePathname();
  const { activeKey } = useNav();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryRoute = useQueryRoute();
  const searchKey = searchParams.get('q') || '';
  const setSearchKey = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    router.replace(`?${params.toString()}`);
  };
  const hotkey = useUserStore(settingsSelectors.getHotkeyById(HotkeyEnum.Search));

  const { t } = useTranslation('discover');
  const { cx, styles } = useStyles();

  const activeType = activeKey === DiscoverTab.Home ? DiscoverTab.Assistants : activeKey;

  useEffect(() => {
    if (!pathname.includes('/discover/search')) return;
    if (!searchKey) queryRoute.push(urlJoin('/discover', activeType));
  }, [searchKey, pathname, activeType]);

  const handleSearch = (value: string) => {
    queryRoute.push(`/discover/search?q=${encodeURIComponent(value)}&type=${encodeURIComponent(activeType)}`);
  };

  return (
    <SearchBar
      allowClear
      autoFocus={mobile || active}
      className={cx(styles.bar, active && styles.active)}
      defaultValue={searchKey ? String(searchKey) : ''}
      enableShortKey={!mobile}
      onBlur={(e) => {
        setActive(false);
        onBlur?.(e);
      }}
      onChange={(e) => setSearchKey(e.target.value)}
      onFocus={(e) => {
        setActive(true);
        onFocus?.(e);
      }}
      onSearch={handleSearch}
      placeholder={t('search.placeholder')}
      shortKey={hotkey}
      spotlight={!mobile}
      style={{ width: mobile || active ? '100%' : 'min(480px,100%)' }}
      styles={{ input: { width: '100%' } }}
      value={searchKey ? String(searchKey) : ''}
      variant={'filled'}
      {...rest}
    />
  );
});

export default withSuspense(StoreSearchBar);
