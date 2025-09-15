import { ActionIcon, Text } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { ArrowDownUpIcon, ToggleLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { useAiInfraStore } from '@/store/aiInfra';
import { aiModelSelectors } from '@/store/aiInfra/selectors';
import { AiModelSourceEnum } from '@/types/aiModel';

import ModelItem from '../ModelItem';
import PaginatedModelList from '../PaginatedModelList';
import SortModelModal from '../SortModelModal';

const EnabledModelList = () => {
  const { t } = useTranslation('modelProvider');

  const enabledModels = useAiInfraStore(aiModelSelectors.enabledAiProviderModelList, isEqual);
  const builtinModels = useAiInfraStore((s) => s.builtinAiModelList);
  const batchToggleAiModels = useAiInfraStore((s) => s.batchToggleAiModels);
  const [open, setOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const isEmpty = enabledModels.length === 0;
  const shouldUsePagination = enabledModels.length > 20; // Use pagination for lists with more than 20 items

  return (
    <>
      <Flexbox horizontal justify={'space-between'}>
        <Text style={{ fontSize: 12, marginTop: 8 }} type={'secondary'}>
          {t('providerModels.list.enabled')}
        </Text>
        {!isEmpty && (
          <Flexbox horizontal>
            <ActionIcon
              icon={ToggleLeft}
              loading={batchLoading}
              onClick={async () => {
                setBatchLoading(true);
                // Only disable non-builtin models (custom and remote models)
                // Check if model exists in builtin list - if it does, don't disable it
                const builtinModelIds = new Set(builtinModels.map(m => m.id));
                const nonBuiltinModels = enabledModels
                  .filter((model) => {
                    // If model exists in builtin list, don't disable it
                    if (builtinModelIds.has(model.id)) return false;
                    // If source is explicitly custom or remote, disable it
                    if (model.source === AiModelSourceEnum.Custom || model.source === AiModelSourceEnum.Remote) return true;
                    // If source is undefined/null and not in builtin list, treat as custom and disable it
                    if (!model.source) return true;
                    // Default: don't disable
                    return false;
                  })
                  .map((i) => i.id);
                
                console.log('All enabled models:', enabledModels.map(m => ({ id: m.id, source: m.source, displayName: m.displayName })));
                console.log('Non-builtin models to disable:', nonBuiltinModels);
                
                if (nonBuiltinModels.length > 0) {
                  await batchToggleAiModels(nonBuiltinModels, false);
                }
                setBatchLoading(false);
              }}
              size={'small'}
              title={t('providerModels.list.enabledActions.disableAll')}
            />

            <ActionIcon
              icon={ArrowDownUpIcon}
              onClick={() => {
                setOpen(true);
              }}
              size={'small'}
              title={t('providerModels.list.enabledActions.sort')}
            />
          </Flexbox>
        )}
        {open && (
          <SortModelModal
            defaultItems={enabledModels}
            onCancel={() => {
              setOpen(false);
            }}
            open={open}
          />
        )}
      </Flexbox>
      {isEmpty ? (
        <Center padding={12}>
          <Text style={{ fontSize: 12 }} type={'secondary'}>
            {t('providerModels.list.enabledEmpty')}
          </Text>
        </Center>
      ) : shouldUsePagination ? (
        <PaginatedModelList
          models={enabledModels}
          itemsPerPage={15}
          virtualizationThreshold={30}
          showVirtualization={true}
        />
      ) : (
        <Flexbox gap={2}>
          {enabledModels.map(({ displayName, id, ...res }) => {
            const label = displayName || id;

            return <ModelItem displayName={label as string} id={id as string} key={id} {...res} />;
          })}
        </Flexbox>
      )}
    </>
  );
};
export default EnabledModelList;
