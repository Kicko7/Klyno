import React from 'react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
