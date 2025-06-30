'use client';

import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function SignupPage() {
  return <SignUp />;
}
