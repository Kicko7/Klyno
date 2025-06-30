'use client';

import React from 'react';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function generateStaticParams() {
  return [];
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
