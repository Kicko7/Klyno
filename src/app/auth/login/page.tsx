'use client';

import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function LoginPage() {
  return <SignIn />;
}
