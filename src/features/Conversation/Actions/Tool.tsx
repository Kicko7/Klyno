import { ActionIconGroup } from '@lobehub/ui';
import { memo } from 'react';

import { useChatStore } from '@/store/chat';

import { useChatListActionsBar } from '../hooks/useChatListActionsBar';
import { RenderAction } from '../types';

export const ToolActionsBar: RenderAction = memo(({ id, onActionClick }) => {
  const { regenerate, del, feedback } = useChatListActionsBar();
  const [reInvokeToolMessage, deleteToolMessage] = useChatStore((s) => [
    s.reInvokeToolMessage,
    s.deleteToolMessage,
  ]);

  return (
    <ActionIconGroup
      items={[regenerate, del]}
      menu={{
        items: [regenerate, del, feedback],
      }}
      onActionClick={async (event) => {
        switch (event.key) {
          case 'regenerate': {
            await reInvokeToolMessage(id);
            break;
          }

          case 'del': {
            await deleteToolMessage(id);
            break;
          }
        }
        
        // Pass other actions to the parent handler
        if (onActionClick) {
          onActionClick(event);
        }
      }}
    />
  );
});
