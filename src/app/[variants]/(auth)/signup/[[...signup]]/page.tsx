import { SignUp } from '@clerk/nextjs';
import { notFound, redirect } from 'next/navigation';

import { serverFeatureFlags } from '@/config/featureFlags';
import { enableClerk } from '@/const/auth';
import { BRANDING_NAME } from '@/const/branding';
import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { RouteVariants } from '@/utils/server/routeVariants';

// Next.js 15+: params is now a Promise, must be awaited
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ [key: string]: string }>;
}) => {
  const _resolvedParams = await params; // Intentionally unused, but must be awaited for future compatibility
  // Explicitly cast to match PropsWithParams for RouteVariants.getLocale
  const locale = await RouteVariants.getLocale({ params } as {
    params: Promise<{ variants: string }>;
  });
  const { t } = await translation('clerk', locale);
  return metadataModule.generate({
    description: t('signup.description', { brand: BRANDING_NAME }),
    title: t('signup.title', { brand: BRANDING_NAME }),
    url: '/signup',
  });
};

// Next.js 15+: params is now a Promise, must be awaited
export default async function Page({ params }: { params: Promise<{ [key: string]: string }> }) {
  const _resolvedParams = await params; // Intentionally unused, but must be awaited for future compatibility
  if (!enableClerk) notFound();
  const enableClerkSignUp = serverFeatureFlags().enableClerkSignUp;
  if (!enableClerkSignUp) {
    redirect('/login');
  }
  return <SignUp fallbackRedirectUrl="/" path="/signup" />;
}

// ---
// This pattern is future-proof for Next.js 15+ and will prevent build errors related to params typing.
// If Next.js changes this again in the future, check the upgrade guide and update the type accordingly.
