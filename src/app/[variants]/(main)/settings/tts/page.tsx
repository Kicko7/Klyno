import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicPageProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

export const generateMetadata = async (_props: DynamicPageProps) => {
  const locale = await RouteVariants.getLocale(_props);
  const { t } = await translation('setting', locale);
  return metadataModule.generate({
    description: t('header.desc'),
    title: t('tab.tts'),
    url: '/settings/tts',
  });
};

const Page = async (_props: DynamicPageProps) => {
  // ...existing code...
};

export default Page;
