import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicPageProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import ProviderGridPage from './(list)/index';

// Next.js 15+: Use DynamicPageProps for page components, not DynamicLayoutProps
const Page = async (_props: DynamicPageProps) => {
  // If you need to pass props, do so here. Otherwise, just render the grid.
  return <ProviderGridPage />;
};

export const generateMetadata = async (_props: DynamicPageProps) => {
  const locale = await RouteVariants.getLocale(_props);
  const { t } = await translation('setting', locale);
  return metadataModule.generate({
    description: t('header.desc'),
    title: t('tab.provider'),
    url: '/settings/provider',
  });
};

export default Page;
