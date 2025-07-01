import React from 'react';

import AuthProvider from '@/layout/AuthProvider';
import GlobalProvider from '@/layout/GlobalProvider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // TODO: Replace these defaults with real user/cookie/device detection if needed
  return (
    <GlobalProvider appearance="dark" isMobile={false} locale="en">
      <AuthProvider>
        <html lang="en">
          <body>{children}</body>
        </html>
      </AuthProvider>
    </GlobalProvider>
  );
}
