import React, { Suspense, lazy } from 'react';

import Loading from '@/components/Loading/BrandTextLoading';
import { DynamicPageProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import Desktop from './_layout/Desktop';
import Mobile from './_layout/Mobile';

const PortalBody = lazy(() => import('@/features/Portal/router'));

// Next.js 15+: Use DynamicPageProps for page components, not DynamicLayoutProps
const Inspector = async (props: DynamicPageProps) => {
  const isMobile = await RouteVariants.getIsMobile(props);

  const Layout = isMobile ? Mobile : Desktop;

  return (
    <Suspense fallback={<Loading />}>
      <Layout>
        <PortalBody />
      </Layout>
    </Suspense>
  );
};

Inspector.displayName = 'ChatInspector';

export default Inspector;
