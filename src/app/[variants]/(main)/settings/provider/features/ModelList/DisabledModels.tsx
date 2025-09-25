import isEqual from 'fast-deep-equal';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAiInfraStore } from '@/store/aiInfra';
import { aiModelSelectors } from '@/store/aiInfra/selectors';

import PaginatedModelList from './PaginatedModelList';

const DisabledModels = memo(() => {
  const { t } = useTranslation('modelProvider');
  const disabledModels = useAiInfraStore(aiModelSelectors.disabledAiProviderModelList, isEqual);

  // Only render if there are disabled models
  if (disabledModels.length === 0) {
    return null;
  }

  return (
    <PaginatedModelList
      models={disabledModels}
      itemsPerPage={10}
      virtualizationThreshold={50}
      title={t('providerModels.list.disabled')}
      description="These are disabled AI models. Scroll down or click 'Show More' to see all available models and enable the ones you want to use."
      showVirtualization={true}
    />
  );
});

export default DisabledModels;
