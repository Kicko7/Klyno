'use client';

import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export const generateStaticParams = () => {
  return [];
};

export default function SignupPage() {
  return <SignUp />;
}
