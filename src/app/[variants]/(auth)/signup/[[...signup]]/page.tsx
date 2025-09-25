import { SignUp } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

import { authEnv } from '@/config/auth';
import { serverFeatureFlags } from '@/config/featureFlags';
import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicLayoutProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';
import SignUpWrapper from '../SignUp';

export const generateMetadata = async (props: DynamicLayoutProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('clerk', locale);
  return metadataModule.generate({
    description: t('signUp.start.subtitle'),
    title: t('signUp.start.title'),
    url: '/signup',
  });
};

const Page = async ({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) => {
  const params = await searchParams;
  const affiliateRef = params.ref as string;

  // Check if Clerk is configured by checking for publishable key
  if (!authEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Clerk Not Configured</h1>
          <p className="text-gray-600">
            Please set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in your environment variables.
          </p>
        </div>
      </div>
    );
  }

  const enableClerkSignUp = serverFeatureFlags().enableClerkSignUp;

  if (!enableClerkSignUp) {
    redirect('/login');
  }

  return (
   <SignUpWrapper affiliateRef={affiliateRef} />
  );
};

Page.displayName = 'SignUp';

export default Page;
