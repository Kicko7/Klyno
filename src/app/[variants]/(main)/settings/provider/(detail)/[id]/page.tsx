import { DEFAULT_MODEL_PROVIDER_LIST } from '@/config/modelProviders';
import { PagePropsWithId } from '@/types/next';

import ClientMode from './ClientMode';
import ProviderDetail from './index';

const Page = async (props: PagePropsWithId) => {
  const params = await props.params;
  
  // Map klyno URL to openrouter provider
  const providerId = params.id === 'klyno' ? 'openrouter' : params.id;

  const builtinProviderCard = DEFAULT_MODEL_PROVIDER_LIST.find((v) => v.id === providerId);
  // if builtin provider
  if (!!builtinProviderCard) return <ProviderDetail source={'builtin'} {...builtinProviderCard} />;

  return <ClientMode id={providerId} />;
};

export default Page;

export const dynamic = 'force-static';
