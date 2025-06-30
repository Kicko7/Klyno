'use client';

import React from 'react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
