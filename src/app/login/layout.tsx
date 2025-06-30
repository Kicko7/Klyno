'use client';

import { NuqsAdapter } from 'nuqs/adapters/next/app';
import React from 'react';

import AuthProvider from '@/layout/AuthProvider';
import GlobalProvider from '@/layout/GlobalProvider';
import { DEFAULT_VARIANTS } from '@/utils/server/routeVariants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

// This layout simply returns its children directly, no Fragment needed
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#f0f6ff', minHeight: '100vh' }}>
      <NuqsAdapter>
        <GlobalProvider
          appearance={DEFAULT_VARIANTS.theme}
          isMobile={DEFAULT_VARIANTS.isMobile}
          locale={DEFAULT_VARIANTS.locale}
          neutralColor={undefined}
          primaryColor={undefined}
        >
          <AuthProvider>{children}</AuthProvider>
        </GlobalProvider>
      </NuqsAdapter>
    </div>
  );
}
