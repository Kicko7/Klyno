'use client';

import { SearchBar } from '@lobehub/ui';
import { useSearchParams, useRouter } from 'next/navigation';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUserStore } from '@/store/user';
import { settingsSelectors } from '@/store/user/selectors';
import { HotkeyEnum } from '@/types/hotkey';

const FilesSearchBar = memo<{ mobile?: boolean }>(({ mobile }) => {
  const { t } = useTranslation('file');
  const hotkey = useUserStore(settingsSelectors.getHotkeyById(HotkeyEnum.Search));
  const [keywords, setKeywords] = useState<string>('');
  const searchParams = useSearchParams();
  const router = useRouter();

  const setQuery = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    router.replace(`?${params.toString()}`);
  };

  return (
    <SearchBar
      allowClear
      enableShortKey={!mobile}
      onChange={(e) => {
        setKeywords(e.target.value);
        if (!e.target.value) setQuery(null);
      }}
      onPressEnter={() => setQuery(keywords)}
      placeholder={t('searchFilePlaceholder')}
      shortKey={hotkey}
      spotlight={!mobile}
      style={{ width: 320 }}
      value={keywords}
      variant={'filled'}
    />
  );
});

export default FilesSearchBar;
