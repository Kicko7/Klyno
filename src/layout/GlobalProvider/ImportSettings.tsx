'use client';

import { useSearchParams } from 'next/navigation';
import { memo, useEffect } from 'react';

import { LOBE_URL_IMPORT_NAME } from '@/const/url';
import { useUserStore } from '@/store/user';

const ImportSettings = memo(() => {
  const [importUrlShareSettings, isUserStateInit] = useUserStore((s) => [
    s.importUrlShareSettings,
    s.isUserStateInit,
  ]);

  // Import settings from the url
  const searchParams = useSearchParams();
  const searchParam = searchParams.get(LOBE_URL_IMPORT_NAME) || '';

  useEffect(() => {
    // Why use `usUserStateInit`,
    // see: https://github.com/lobehub/lobe-chat/pull/4072
    if (searchParam && isUserStateInit) importUrlShareSettings(searchParam);
  }, [searchParam, isUserStateInit]);

  return null;
});

export default ImportSettings;
