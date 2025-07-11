import { redirect } from 'next/navigation';

import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicPageProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import Category from './features/Category';

// Next.js 15+: Use DynamicPageProps for page components, not DynamicLayoutProps
export const generateMetadata = async (props: DynamicPageProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('common', locale);
  return metadataModule.generate({
    title: t('userPanel.data'),
    url: '/me/data',
  });
};

const Page = async (props: DynamicPageProps) => {
  const mobile = await RouteVariants.getIsMobile(props);

  if (!mobile) return redirect('/chat');

  return <Category />;
};

Page.displayName = 'MeData';

export default Page;
