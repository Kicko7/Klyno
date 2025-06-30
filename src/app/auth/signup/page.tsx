'use client';

import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function generateStaticParams() {
  return [];
}

export default function SignupPage() {
  return <SignUp />;
}
