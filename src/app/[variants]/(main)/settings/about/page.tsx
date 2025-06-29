import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicPageProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import Page from './index';

export const generateMetadata = async (props: DynamicPageProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('setting', locale);
  return metadataModule.generate({
    description: t('header.desc'),
    title: t('tab.about'),
    url: '/settings/about',
  });
};

export default async (props: DynamicPageProps) => {
  const isMobile = await RouteVariants.getIsMobile(props);

  return <Page mobile={isMobile} />;
};
