import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Flexbox } from 'react-layout-kit';
import { DraggablePanel } from '@lobehub/ui';
import { useSendMessage } from '@/features/ChatInput/useSend';
import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/slices/message/selectors';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { ActionKeys } from '@/features/ChatInput/ActionBar/config';
import { CHAT_TEXTAREA_HEIGHT } from '@/const/layoutTokens';
import InputArea from '@/features/ChatInput/Desktop/InputArea';
import Head from '@/features/ChatInput/Desktop/Header';
import Footer from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatInput/Desktop/Footer';

const leftActions = [
  'model',
  'fileUpload',
  'knowledgeBase',
  'params',
  'stt',
  'tools',
] as ActionKeys[];

const rightActions = ['clear'] as ActionKeys[];

interface TeamChatInputProps {
  teamChatId?: string;
  onSendMessage?: (content: string) => Promise<void>;
}

const TeamChatInput = ({ teamChatId, onSendMessage }: TeamChatInputProps) => {
  const [inputMessage, setInputMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [inputHeight, updatePreference] = useGlobalStore((s) => [
    systemStatusSelectors.inputHeight(s),
    s.updateSystemStatus,
  ]);

  const handleSend = useCallback(async () => {
    const messageToSend = inputMessage.trim();
    if (messageToSend && onSendMessage && teamChatId) {
      setLoading(true);
      try {
        await onSendMessage(messageToSend);
        setInputMessage(''); // Clear input after sending
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [inputMessage, onSendMessage, teamChatId]);

  return (
    <DraggablePanel
      minHeight={CHAT_TEXTAREA_HEIGHT}
      onSizeChange={(_, size) => {
        if (!size) return;
        const height =
          typeof size.height === 'string' ? Number.parseInt(size.height) : size.height;
        if (!height) return;
        updatePreference({ inputHeight: height });
      }}
      placement="bottom"
      size={{ height: inputHeight, width: '100%' }}
      style={{ zIndex: 10 }}
    >
      <Flexbox
        gap={8}
        height={'100%'}
        paddingBlock={'4px 16px'}
        style={{ minHeight: CHAT_TEXTAREA_HEIGHT, position: 'relative' }}
      >
        <Head
          expand={false}
          leftActions={leftActions}
          rightActions={rightActions}
          setExpand={() => {}}
        />
        <InputArea
          loading={loading}
          onChange={(value) => setInputMessage(value)}
          onSend={handleSend}
          value={inputMessage}
        />
        <Footer expand={false} onExpandChange={() => {}} />
      </Flexbox>
    </DraggablePanel>
  );
};

export default TeamChatInput;

