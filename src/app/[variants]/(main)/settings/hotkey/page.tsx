import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { DynamicPageProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import Conversation from './features/Conversation';
import Essential from './features/Essential';

// Next.js 15+: Use DynamicPageProps for page components, not DynamicLayoutProps
export const generateMetadata = async (_props: DynamicPageProps) => {
  const locale = await RouteVariants.getLocale(_props);
  const { t } = await translation('setting', locale);
  return metadataModule.generate({
    description: t('header.desc'),
    title: t('tab.hotkey'),
    url: '/settings/hotkey',
  });
};

const Page = async (_props: DynamicPageProps) => {
  return (
    <>
      <Essential />
      <Conversation />
    </>
  );
};

Page.displayName = 'HotkeySetting';

export default Page;
