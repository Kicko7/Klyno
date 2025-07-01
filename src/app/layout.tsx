import { ClerkProvider } from '@clerk/nextjs';
import React from 'react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
