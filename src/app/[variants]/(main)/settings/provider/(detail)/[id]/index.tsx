'use client';

import { memo, useEffect } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useAiInfraStore } from '@/store/aiInfra';

import ModelList from '../../features/ModelList';
import ProviderConfig, { ProviderConfigProps } from '../../features/ProviderConfig';

interface ProviderDetailProps extends ProviderConfigProps {
  showConfig?: boolean;
}
const ProviderDetail = memo<ProviderDetailProps>(({ showConfig = true, ...card }) => {
  // Don't show model list if provider is openrouter
  const shouldShowModelList = card.id !== 'openrouter';

  const setActiveAiProvider = useAiInfraStore((s) => s.setActiveAiProvider);

  // Set activeAiProvider for builtin providers like OpenRouter
  useEffect(() => {
    setActiveAiProvider(card.id);
  }, [card.id, setActiveAiProvider]);
  return (
    <Flexbox gap={24} paddingBlock={8}>
      {/* ↓ cloud slot ↓ */}

      {/* ↑ cloud slot ↑ */}
      {showConfig && shouldShowModelList && <ProviderConfig {...card} />}
      {<ModelList id={card.id} {...card.settings} />}
    </Flexbox>
  );
});

export default ProviderDetail;
