import { SignIn } from '@clerk/nextjs';

import { authEnv } from '@/config/auth';
import { BRANDING_NAME } from '@/const/branding';
import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicLayoutProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

export const generateMetadata = async (props: DynamicLayoutProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('clerk', locale);
  return metadataModule.generate({
    description: t('signIn.start.subtitle'),
    title: t('signIn.start.title', { applicationName: BRANDING_NAME }),
    url: '/login',
  });
};

const Page = () => {
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

  return (
    <div className="flex h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            card: 'shadow-lg',
            rootBox: 'mx-auto',
          },
        }}
        fallbackRedirectUrl="/"
        path="/login"
        routing="path"
        signUpUrl="/signup"
      />
    </div>
  );
};

Page.displayName = 'Login';

export default Page;
