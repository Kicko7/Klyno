'use client';

import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function LoginPage() {
  return <SignIn fallbackRedirectUrl="/" />;
}
