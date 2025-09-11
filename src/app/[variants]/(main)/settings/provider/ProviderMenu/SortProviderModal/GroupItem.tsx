import { ProviderIcon } from '@lobehub/icons';
import { Avatar, SortableList } from '@lobehub/ui';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import CustomOpenRouterIcon from '@/components/ProviderIcons/CustomOpenRouterIcon';
import { AiProviderListItem } from '@/types/aiProvider';

const GroupItem = memo<AiProviderListItem>(({ id, name, source, logo }) => {
  console.log('name', name,'id', id);
  return (
    <>
      <Flexbox gap={8} horizontal>
        {source === 'custom' && logo ? (
          <Avatar
            alt={name || id}
            avatar={logo}
            shape={'square'}
            size={24}
            style={{ borderRadius: 6 }}
          />
        ) : name === 'openrouter' ? (
          <CustomOpenRouterIcon size={24} style={{ borderRadius: 6 }} type={'avatar'} />
        ) : (
          <ProviderIcon provider={id} size={24} style={{ borderRadius: 6 }} type={'avatar'} />
        )}
        {name}
      </Flexbox>
      <SortableList.DragHandle />
    </>
  );
});

export default GroupItem;
