import { Button, Text } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { ChevronDown } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useAiInfraStore } from '@/store/aiInfra';
import { aiModelSelectors } from '@/store/aiInfra/selectors';

import ModelItem from './ModelItem';
import VirtualizedModelList from './VirtualizedModelList';

const DisabledModels = memo(() => {
  const { t } = useTranslation('modelProvider');

  const [showMore, setShowMore] = useState(false);
  const disabledModels = useAiInfraStore(aiModelSelectors.disabledAiProviderModelList, isEqual);

  // Memoize the display models to prevent unnecessary recalculations
  const displayModels = useMemo(() => {
    return showMore ? disabledModels : disabledModels.slice(0, 10);
  }, [disabledModels, showMore]);

  // Memoize the show more button click handler
  const handleShowMore = useCallback(() => {
    setShowMore(true);
  }, []);

  // Only render if there are disabled models
  if (disabledModels.length === 0) {
    return null;
  }

  return (
    <Flexbox>
      <Text style={{ fontSize: 12, marginTop: 8 }} type={'secondary'}>
        {t('providerModels.list.disabled')}
      </Text>
      {showMore ? (
        disabledModels.length > 50 ? (
          // Use virtualization for very large lists to prevent hanging
          <VirtualizedModelList 
            models={disabledModels} 
            height={Math.min(600, Math.max(400, disabledModels.length * 2))} 
          />
        ) : (
          // Use regular rendering for small-medium lists when showing all
          disabledModels.map((item) => (
            <ModelItem {...item} key={item.id} />
          ))
        )
      ) : (
        // Show only first 10 items with "Show All" button
        <>
          {displayModels.map((item) => (
            <ModelItem {...item} key={item.id} />
          ))}
          {disabledModels.length > 10 && (
            <Button
              block
              icon={ChevronDown}
              onClick={handleShowMore}
              size={'small'}
            >
              {t('providerModels.list.disabledActions.showMore')}
            </Button>
          )}
        </>
      )}
    </Flexbox>
  );
});

export default DisabledModels;
