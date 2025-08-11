'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Center } from 'react-layout-kit';
import { useTranslation } from 'react-i18next';
import { Skeleton } from 'antd';

// Dynamically import the monitoring dashboard to avoid SSR issues
const MonitoringDashboard = dynamic(
  () => import('@/components/TeamChat/MonitoringDashboard').then(mod => ({ default: mod.MonitoringDashboard })),
  { 
    ssr: false,
    loading: () => (
      <Center style={{ height: '100vh', width: '100%' }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Center>
    )
  }
);

export default function MonitoringPage() {
  const { t } = useTranslation('common');

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <Suspense
        fallback={
          <Center style={{ height: '100vh', width: '100%' }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Center>
        }
      >
        <MonitoringDashboard />
      </Suspense>
    </div>
  );
}
