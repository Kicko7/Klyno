import { SignIn } from '@clerk/nextjs';
import { notFound } from 'next/navigation';

import { enableClerk } from '@/const/auth';
import { BRANDING_NAME } from '@/const/branding';
import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { RouteVariants } from '@/utils/server/routeVariants';

export const generateMetadata = async ({ params }: { params: { [key: string]: string } }) => {
  const locale = await RouteVariants.getLocale({ params } as any);
  const { t } = await translation('clerk', locale);
  return metadataModule.generate({
    description: t('signIn.start.subtitle'),
    title: t('signIn.start.title', { applicationName: BRANDING_NAME }),
    url: '/login',
  });
};

const Page = () => {
  if (!enableClerk) return notFound();

  return <SignIn path="/login" />;
};

Page.displayName = 'Login';

export default Page;
