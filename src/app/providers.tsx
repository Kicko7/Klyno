'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import React from 'react';

import AuthProvider from '@/layout/AuthProvider';
import GlobalProvider from '@/layout/GlobalProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Added signInFallbackRedirectUrl to fix Clerk afterSignInUrl deprecation warning.
    // See: https://clerk.com/docs/custom-redirect-url-props
    <ClerkProvider appearance={{ baseTheme: dark }} signInFallbackRedirectUrl="/chat">
      <GlobalProvider appearance="dark" isMobile={false} locale="en">
        <AuthProvider>{children}</AuthProvider>
      </GlobalProvider>
    </ClerkProvider>
  );
}
