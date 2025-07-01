import { ClerkProvider } from '@clerk/nextjs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ReactNode } from 'react';

import AuthProvider from '@/layout/AuthProvider';
import GlobalProvider from '@/layout/GlobalProvider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function RootLayout({ children }: { children: ReactNode }) {
  // TODO: Replace these defaults with real user/cookie/device detection if needed
  return (
    <html lang="en">
      <body>
        <GlobalProvider appearance="dark" isMobile={false} locale="en">
          <AuthProvider>
            <NuqsAdapter>
              <ClerkProvider>{children}</ClerkProvider>
            </NuqsAdapter>
          </AuthProvider>
        </GlobalProvider>
      </body>
    </html>
  );
}
