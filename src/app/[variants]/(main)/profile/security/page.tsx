import { notFound } from 'next/navigation';

import { enableClerk } from '@/const/auth';
import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicPageProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import ClerkProfile from '../features/ClerkProfile';

// Next.js 15+: Use DynamicPageProps for page components, not DynamicLayoutProps
export const generateMetadata = async (props: DynamicPageProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('auth', locale);
  return metadataModule.generate({
    description: t('header.desc'),
    title: t('tab.security'),
    url: '/profile/security',
  });
};

const Page = async (props: DynamicPageProps) => {
  if (!enableClerk) return notFound();
  const mobile = await RouteVariants.getIsMobile(props);

  return <ClerkProfile mobile={mobile} />;
};

export default Page;
