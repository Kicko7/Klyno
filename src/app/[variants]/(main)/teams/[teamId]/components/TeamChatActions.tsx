import { ActionIconGroup, type ActionIconGroupEvent, type ActionIconGroupProps } from '@lobehub/ui';
import { App } from 'antd';
import isEqual from 'fast-deep-equal';
import { memo, use, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { renderActions } from '@/features/Conversation/Actions';
import { VirtuosoContext } from '@/features/Conversation/components/VirtualizedList/VirtuosoContext';
import { useChatListActionsBar } from '@/features/Conversation/hooks/useChatListActionsBar';
import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/selectors';
import { useTeamChatStore } from '@/store/teamChat';
import { MessageRoleType } from '@/types/message';
import { nanoid } from 'nanoid';
import { agentSelectors } from '@/store/agent/selectors';
import { getAgentStoreState, useAgentStore } from '@/store/agent';
import { gatherChatHistory } from '../../components/TeamChatInput';
import { chatService } from '@/services/chat';

// import { renderActions } from '../../Actions';
// import { useChatListActionsBar } from '../../hooks/useChatListActionsBar';

export type ActionsBarProps = ActionIconGroupProps;

const ActionsBar = memo<ActionsBarProps>((props) => {
  const { regenerate, edit, copy, divider, del } = useChatListActionsBar();

  return (
    <ActionIconGroup
      items={[regenerate, edit]}
      menu={{
        items: [edit, copy, regenerate, divider, del],
      }}
      {...props}
    />
  );
});

interface ActionsProps {
  id: string;
  inPortalThread?: boolean;
  index: number;
}

const Actions = memo<ActionsProps>(({ id, inPortalThread, index }) => {
  const item = useChatStore(chatSelectors.getMessageById(id), isEqual);
  const getMessageById = useTeamChatStore((state)=>state.getMessageById)
  const deleteMessageById = useTeamChatStore((state)=>state.deleteMessage)
  const copyMessage = useTeamChatStore((state)=>state.copyMessage);
  const toggleMessageEditing = useTeamChatStore((state)=>state.toggleMessageEditing)
  const sendMessage = useTeamChatStore((state)=>state.sendMessage)
  const agentConfig = useAgentStore(agentSelectors.currentAgentConfig);
  const agentState = getAgentStoreState();
  const teamChatStore = useTeamChatStore();

  const messageInfo:any = useMemo(() => getMessageById(id), [getMessageById, id]);
  const { t } = useTranslation('common');
  const [
    regenerateMessage,
    translateMessage,
    ttsMessage,
    delAndRegenerateMessage,
    openThreadCreator,
    resendThreadMessage,
    delAndResendThreadMessage,
    // toggleMessageEditing,
  ] = useChatStore((s) => [
    s.deleteMessage,
    s.regenerateMessage,
    s.translateMessage,
    s.ttsMessage,
    s.delAndRegenerateMessage,
    s.copyMessage,
    s.openThreadCreator,
    s.resendThreadMessage,
    s.delAndResendThreadMessage,
    s.toggleMessageEditing,
  ]);
  const { message } = App.useApp();
  const virtuosoRef = use(VirtuosoContext);

  const [showShareModal, setShareModal] = useState(false);

  

  const handleActionClick = useCallback(
    async (action: ActionIconGroupEvent) => {
      switch (action.key) {
        case 'edit': {
          toggleMessageEditing(id, true);
          virtuosoRef?.current?.scrollIntoView({ align: 'start', behavior: 'auto', index });
        }
      }
      // if (!messageInfo) return;

      switch (action.key) {
        case 'copy': {
          await copyMessage(messageInfo?.content);
          message.success(t('copySuccess', { defaultValue: 'Copy Success' }));
          break;
        }
        case 'branching': {
          // openThreadCreator(id);
          break;
        }

        case 'del': {
          console.log("Deleting")
          deleteMessageById(messageInfo?.teamChatId,id);
          break;
        }

        case 'regenerate': {
          const assistantMessageId = nanoid();
        
          // Create a placeholder assistant message
          sendMessage(messageInfo.teamChatId, '', 'assistant', assistantMessageId);
        
          // Gather history including the original user message
          const agentConfig = agentSelectors.currentAgentConfig(agentState);
          const messages = await gatherChatHistory(
            messageInfo.teamChatId,
            messageInfo.content,
            teamChatStore.messages,
            agentConfig,
          );
        
          // Add the original user message to the history
          const currentMessage: any = {
            role: 'user',
            content: messageInfo.content,
            sessionId: messageInfo.teamChatId,
            files: messageInfo.metadata?.files || [],
          };
          messages.push(currentMessage);
        
          let aiResponse = '';
        
          // Stream assistant response
          await chatService.createAssistantMessageStream({
            params: {
              messages: messages as any,
              model: agentConfig.model,
              provider: agentConfig.provider,
              ...agentConfig.params,
              plugins: agentConfig.plugins,
            },
            onMessageHandle: (chunk) => {
              if ('text' in chunk && chunk.text) {
                aiResponse += chunk.text;
                sendMessage(messageInfo.teamChatId, aiResponse, 'assistant', assistantMessageId);
              }
            },
            onFinish: async (finalContent, context) => {
              const finalMessage = finalContent || aiResponse || 'No response generated';
              const metadata = context?.usage
                ? {
                    ...context.usage,
                    model: agentConfig.model,
                    provider: agentConfig.provider,
                    totalTokens: context.usage.totalTokens || 0,
                  }
                : {
                    model: agentConfig.model,
                    provider: agentConfig.provider,
                  };
        
              await sendMessage(
                messageInfo.teamChatId,
                finalMessage,
                'assistant',
                assistantMessageId,
                false,
                metadata,
              );
            },
            onErrorHandle: (error) => {
              console.error('AI response error:', error);
              sendMessage(
                messageInfo.teamChatId,
                'Sorry, I encountered an error regenerating the response.',
                'assistant',
                assistantMessageId,
              );
            },
          });
        
          break;
        }

        case 'delAndRegenerate': {
          if (inPortalThread) {
            delAndResendThreadMessage(id);
          } else {
            delAndRegenerateMessage(id);
          }
          break;
        }

        case 'tts': {
          // ttsMessage(id);
          break;
        }

        // case 'export': {
        //   setModal(true);
        //   break;
        // }

        case 'share': {
          setShareModal(true);
          break;
        }
      }

      if (action.keyPath.at(-1) === 'translate') {
        // click the menu item with translate item, the result is:
        // key: 'en-US'
        // keyPath: ['en-US','translate']
        const lang = action.keyPath[0];
        // translateMessage(id, lang);
      }
    },
    [item],
  );

  const RenderFunction = renderActions[(item?.role || '') as MessageRoleType] ?? ActionsBar;

  //   if (!item) return null;

  return (
    <>
      <RenderFunction {...item} onActionClick={handleActionClick} />
      {/*{showModal && (*/}
      {/*  <ExportPreview content={item.content} onClose={() => setModal(false)} open={showModal} />*/}
      {/*)}*/}
      {/* <ShareMessageModal
        message={item}
        onCancel={() => {
          setShareModal(false);
        }}
        open={showShareModal}
      /> */}
    </>
  );
});

export default Actions;
