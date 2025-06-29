import { redirect } from 'next/navigation';

import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicPageProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import Category from './features/Category';

// Next.js 15+: Use DynamicPageProps for page components, not DynamicLayoutProps
export const generateMetadata = async (props: DynamicPageProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('auth', locale);
  return metadataModule.generate({
    description: t('header.desc'),
    title: t('header.title'),
    url: '/me/profile',
  });
};

const Page = async (props: DynamicPageProps) => {
  const isMobile = await RouteVariants.getIsMobile(props);

  if (!isMobile) return redirect('/profile');

  return <Category />;
};

Page.displayName = 'MeProfile';

export default Page;
