'use client';

import { ClerkProvider } from '@clerk/nextjs';
import '@clerk/nextjs/dist/clerk.css';
import { dark } from '@clerk/themes';
import React from 'react';

import AuthProvider from '@/layout/AuthProvider';
import GlobalProvider from '@/layout/GlobalProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <GlobalProvider appearance="dark" isMobile={false} locale="en">
        <AuthProvider>{children}</AuthProvider>
      </GlobalProvider>
    </ClerkProvider>
  );
}
