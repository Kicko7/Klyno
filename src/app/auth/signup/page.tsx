'use client';

import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return <SignUp />;
}
