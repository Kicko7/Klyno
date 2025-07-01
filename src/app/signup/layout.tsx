'use client';

import React from 'react';

import AuthProvider from '@/layout/AuthProvider';
import GlobalProvider from '@/layout/GlobalProvider';
import { DEFAULT_VARIANTS } from '@/utils/server/routeVariants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// This layout simply returns its children directly, no Fragment needed
export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#f6fff0', minHeight: '100vh' }}>
      <GlobalProvider
        appearance={DEFAULT_VARIANTS.theme}
        isMobile={DEFAULT_VARIANTS.isMobile}
        locale={DEFAULT_VARIANTS.locale}
        neutralColor={undefined}
        primaryColor={undefined}
      >
        <AuthProvider>{children}</AuthProvider>
      </GlobalProvider>
    </div>
  );
}
