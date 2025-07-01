import { SignIn } from '@clerk/nextjs';
import { notFound } from 'next/navigation';

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
  // metadataModule is a class instance, use .generate
  return metadataModule.generate({
    description: t('login.description', { brand: BRANDING_NAME }),
    title: t('login.title', { brand: BRANDING_NAME }),
    url: '/login',
  });
};

// Next.js 15+: params is now a Promise, must be awaited
export default async function Page({ params }: { params: Promise<{ [key: string]: string }> }) {
  const _resolvedParams = await params; // Intentionally unused, but must be awaited for future compatibility
  if (!enableClerk) notFound();
  return <SignIn fallbackRedirectUrl="/" />;
}

// ---
// This pattern is future-proof for Next.js 15+ and will prevent build errors related to params typing.
// If Next.js changes this again in the future, check the upgrade guide and update the type accordingly.
