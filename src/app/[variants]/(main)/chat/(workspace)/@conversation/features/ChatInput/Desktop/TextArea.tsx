import { notification } from 'antd';
import { memo } from 'react';

import InputArea from '@/features/ChatInput/Desktop/InputArea';
import { useSendMessage } from '@/features/ChatInput/useSend';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/slices/message/selectors';

const TextArea = memo<{ onSend?: () => void }>(({ onSend }) => {
  const [loading, value, updateInputMessage] = useChatStore((s) => [
    chatSelectors.isAIGenerating(s),
    s.inputMessage,
    s.updateInputMessage,
  ]);
  const { send: sendMessage } = useSendMessage();

  const { subscriptionInfo } = useUserSubscription();

  const currentAgent = useAgentStore(agentSelectors.currentAgentConfig);
  console.log('subscriptionInfo', subscriptionInfo);

  return (
    <InputArea
      loading={loading}
      onChange={updateInputMessage}
      onSend={() => {
        // if (currentAgent.model !== 'gpt-4.1-mini') {
        //   if (!subscriptionInfo || subscriptionInfo.currentCredits === 0) {
        //     notification.error({
        //       message: "You don't have enough credits to use this model",
        //       description:
        //         'Please upgrade to a paid plan to continue using this model or use the gpt-4.1-mini model',
        //       duration: 3,
        //       placement: 'topRight',
        //     });
        //   } else {
        //     sendMessage();
        //     onSend?.();
        //   }
        // } else {
        sendMessage();
        onSend?.();
        // }
      }}
      value={value}
    />
  );
});

export default TextArea;
