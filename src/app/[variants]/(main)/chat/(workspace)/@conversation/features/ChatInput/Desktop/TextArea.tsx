import { memo } from 'react';

import InputArea from '@/features/ChatInput/Desktop/InputArea';
import { useSendMessage } from '@/features/ChatInput/useSend';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/slices/chat/selectors';
import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/slices/message/selectors';
import { message } from 'antd';

const TextArea = memo<{ onSend?: () => void }>(({ onSend }) => {
  const [loading, value, updateInputMessage] = useChatStore((s) => [
    chatSelectors.isAIGenerating(s),
    s.inputMessage,
    s.updateInputMessage,
  ]);
  const { send: sendMessage } = useSendMessage();
  const agentConfig = useAgentStore(agentSelectors.currentAgentConfig);
  console.log('agentConfig', agentConfig);
  const { subscriptionInfo: subscription } = useUserSubscription();
  return (
    <InputArea
      loading={loading}
      onChange={updateInputMessage}
      onSend={() => {
        if(agentConfig.provider === "openrouter" && !agentConfig.model.includes('free')) {
          if(subscription?.currentCredits && subscription?.currentCredits <= 0) {
            message.error('You have no credits left');
            return;
          } if(!subscription) {
            message.error('To use KlynoAI (paid models) you have to buy a subscription');
            return;
          }
        }
        sendMessage({}, subscription);
        onSend?.();
      }}
      value={value}
    />
  );
});

export default TextArea;
