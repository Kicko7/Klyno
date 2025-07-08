'use client';

import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function LoginPage() {
  return (
    <div
      style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '80vh' }}
    >
      <SignIn fallbackRedirectUrl="/chat" />
    </div>
  );
}
