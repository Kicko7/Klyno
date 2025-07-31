import React, { useCallback, useMemo, useState } from 'react';
import { ProviderIcon } from '@lobehub/icons';
import { Button } from '@lobehub/ui';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { ModelProvider } from '@/libs/model-runtime';
import { useTeamChatStore } from '@/store/teamChat';
import { GlobalLLMProviderKey } from '@/types/user/settings';
import { LoadingContext } from '@/features/Conversation/Error/APIKeyForm/LoadingContext';
import ProviderApiKeyForm from '@/features/Conversation/Error/APIKeyForm/ProviderApiKeyForm';
import BedrockForm from '@/features/Conversation/Error/APIKeyForm/Bedrock';

interface TeamAPIKeyFormProps {
  id: string;
  provider?: string;
}

const TeamAPIKeyForm: React.FC<TeamAPIKeyFormProps> = ({ id, provider }) => {
  const { t } = useTranslation('error');
  const [loading, setLoading] = useState(false);
  const { retryMessage, messages, activeTeamChatId } = useTeamChatStore();
  
  const apiKeyPlaceholder = useMemo(() => {
    switch (provider) {
      case ModelProvider.Anthropic: {
        return 'sk-ant_*****************************';
      }
      case ModelProvider.OpenRouter: {
        return 'sk-or-********************************';
      }
      case ModelProvider.Perplexity: {
        return 'pplx-********************************';
      }
      case ModelProvider.ZhiPu: {
        return '*********************.*************';
      }
      case ModelProvider.Groq: {
        return 'gsk_*****************************';
      }
      case ModelProvider.DeepSeek: {
        return 'sk_******************************';
      }
      case ModelProvider.Qwen: {
        return 'sk-********************************';
      }
      case ModelProvider.Github: {
        return 'ghp_*****************************';
      }
      default: {
        return '*********************************';
      }
    }
  }, [provider]);
  
  const handleConfirmAndRetry = useCallback(async () => {
    if (!activeTeamChatId) return;
    
    setLoading(true);
    try {
      // Find the previous user message to retry with
      const chatMessages = messages[activeTeamChatId] || [];
      const errorMessageIndex = chatMessages.findIndex(m => m.id === id);
      
      if (errorMessageIndex > 0) {
        // Look for the previous user message
        for (let i = errorMessageIndex - 1; i >= 0; i--) {
          const prevMessage = chatMessages[i];
          if (prevMessage.messageType === 'user') {
            console.log('🔄 Retrying with user message:', prevMessage.content);
            await retryMessage(activeTeamChatId, id, prevMessage.content);
            break;
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, retryMessage, messages, activeTeamChatId]);
  
  const handleDeleteMessage = useCallback(() => {
    if (!activeTeamChatId) return;
    
    // For now, we'll just clear the error message content
    // In a full implementation, you might want to remove the message entirely
    console.log('🗑️ Deleting error message:', id);
  }, [id, activeTeamChatId]);

  return (
    <LoadingContext value={{ loading, setLoading }}>
      <Center gap={16} style={{ maxWidth: 300 }}>
        {provider === ModelProvider.Bedrock ? (
          <BedrockForm />
        ) : (
          <ProviderApiKeyForm
            apiKeyPlaceholder={apiKeyPlaceholder}
            avatar={<ProviderIcon provider={provider} size={80} type={'avatar'} />}
            provider={provider as GlobalLLMProviderKey}
            showEndpoint={provider === ModelProvider.OpenAI}
          />
        )}
        <Flexbox gap={12} width={'100%'}>
          <Button
            block
            disabled={loading}
            onClick={handleConfirmAndRetry}
            style={{ marginTop: 8 }}
            type={'primary'}
          >
            {t('unlock.confirm')}
          </Button>
          <Button
            onClick={handleDeleteMessage}
          >
            {t('unlock.closeMessage')}
          </Button>
        </Flexbox>
      </Center>
    </LoadingContext>
  );
};

export default TeamAPIKeyForm;
