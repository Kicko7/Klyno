import { ActionIconGroup, type ActionIconGroupEvent, type ActionIconGroupProps } from '@lobehub/ui';
import { App } from 'antd';
import { Copy, Edit, Trash } from 'lucide-react';
import { memo, use, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { TeamChatMessageItem } from '@/database/schemas/teamChat';
import { VirtuosoContext } from '@/features/Conversation/components/VirtualizedList/VirtuosoContext';
import { chatService } from '@/services/chat';
import { useAgentStore } from '@/store/agent';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';


export type ActionsBarProps = ActionIconGroupProps;

const ActionsBar = memo<ActionsBarProps>((props) => {
  return <ActionIconGroup {...props} />;
});

ActionsBar.displayName = 'ActionsBar';

interface ActionsProps {
  id: string;
  inPortalThread?: boolean;
  index: number;
}

const Actions = memo<ActionsProps>(({ id, inPortalThread, index }) => {
  const getMessageById = useTeamChatStore((state) => state.getMessageById);
  const removeMessage = useTeamChatStore((state) => state.removeMessage);
  const copyMessage = useTeamChatStore((state) => state.copyMessage);
  const toggleMessageEditing = useTeamChatStore((state) => state.toggleMessageEditing);
  const sendMessage = useTeamChatStore((state) => state.sendMessage);
  const agentState = useAgentStore();
  const removeWebSocketMessage = useTeamChatStore((state) => state.removeWebSocketMessage);
  const messageInfo: TeamChatMessageItem | undefined = useMemo(
    () => getMessageById(id),
    [getMessageById, id],
  );

  const currentUser = useUserStore(userProfileSelectors.userProfile);
  const isUserMessage =
    messageInfo?.messageType === 'user' && messageInfo?.userId === currentUser?.id;


  const { t } = useTranslation('common');
  const { message } = App.useApp();
  const virtuosoRef = use(VirtuosoContext);


  const handleActionClick = useCallback(
    async (action: ActionIconGroupEvent) => {
      if (!messageInfo) return;

      switch (action.key) {
        case 'edit': {
          toggleMessageEditing(id, true);
          virtuosoRef?.current?.scrollIntoView({ align: 'start', behavior: 'auto', index });
          break;
        }
        case 'copy': {
          await copyMessage(messageInfo.content);
          message.success(t('copySuccess', { defaultValue: 'Copy Success' }));
          break;
        }
        case 'reaction': {
          break;
        }
        case 'read': {
          break;
        }
        case 'branching': {
          break;
        }
        case 'del': {
          removeMessage(messageInfo.teamChatId, id);
          removeWebSocketMessage(id);
          message.success(t('deleteSuccess', { defaultValue: 'Message deleted' }));
          break;
        }
        case 'regenerate': {
          break;
        }
      }
    },
    [
      messageInfo,
      id,
      index,
      toggleMessageEditing,
      virtuosoRef,
      copyMessage,
      message,
      t,
      removeMessage,
      sendMessage,
      agentState,
      chatService,
    ],
  );

  return (
    <ActionsBar
      items={[
        {
          icon: Copy,
          key: 'copy',
          label: t('copy', { defaultValue: 'Copy' }),
        },
        ...(isUserMessage
          ? [
              {
                icon: Edit,
                key: 'edit',
                label: t('edit', { defaultValue: 'Edit' }),
              },
              {
                icon: Trash,
                key: 'del',
                label: t('delete', { defaultValue: 'Delete' }),
              },
            ]
          : []),
      ]}
      onActionClick={handleActionClick}
    />
  );
});

Actions.displayName = 'Actions';

export default Actions;
