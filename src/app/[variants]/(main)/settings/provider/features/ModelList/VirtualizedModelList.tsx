import { FixedSizeList as List } from 'react-window';
import { memo, useMemo } from 'react';
import { Flexbox } from 'react-layout-kit';

import ModelItem from './ModelItem';
import { AiProviderModelListItem } from '@/types/aiModel';

interface VirtualizedModelListProps {
  models: AiProviderModelListItem[];
  height?: number;
}

interface ModelItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    models: AiProviderModelListItem[];
  };
}

const ModelItemWrapper = memo<ModelItemProps>(({ index, style, data }) => {
  const model = data.models[index];
  
  return (
    <div style={style}>
      <ModelItem {...model} key={model.id} />
    </div>
  );
});

ModelItemWrapper.displayName = 'ModelItemWrapper';

const VirtualizedModelList = memo<VirtualizedModelListProps>(({ models, height = 400 }) => {
  const itemData = useMemo(() => ({ models }), [models]);

  if (models.length === 0) {
    return null;
  }

  return (
    <Flexbox>
      <List
        height={height}
        itemCount={models.length}
        itemData={itemData}
        itemSize={60} // Approximate height of each model item
        width="100%"
      >
        {ModelItemWrapper}
      </List>
    </Flexbox>
  );
});

VirtualizedModelList.displayName = 'VirtualizedModelList';

export default VirtualizedModelList;
