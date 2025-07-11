import { Skeleton } from 'antd';
import dynamic from 'next/dynamic';

import { enableClerk } from '@/const/auth';
import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicPageProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import Client from '../Client';

// 为了兼容 ClerkProfile， 需要使用 [[...slug]]

const ClerkProfile = dynamic(() => import('../../features/ClerkProfile'), {
  loading: () => (
    <div style={{ flex: 1 }}>
      <Skeleton paragraph={{ rows: 8 }} title={false} />
    </div>
  ),
});

// Next.js 15+: Use DynamicPageProps for page components, not DynamicLayoutProps
export const generateMetadata = async (props: DynamicPageProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('auth', locale);
  return metadataModule.generate({
    description: t('header.desc'),
    title: t('tab.profile'),
    url: '/profile',
  });
};

const Page = async (props: DynamicPageProps) => {
  const mobile = await RouteVariants.getIsMobile(props);

  if (enableClerk) return <ClerkProfile mobile={mobile} />;

  return <Client mobile={mobile} />;
};

export default Page;
