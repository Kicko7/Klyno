import { ActionIcon } from '@lobehub/ui';
import { Upload } from 'antd';
import { FileUp } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFileStore } from '@/store/file';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useModelSupportVision } from '@/hooks/useModelSupportVision';

interface FileUploadProps {
  sessionId?: string;
}

const FileUpload = memo<FileUploadProps>(({ sessionId }) => {
  const { t } = useTranslation('chat');

  const upload = useFileStore((s) => s.uploadChatFiles);
  
  // Get current model and check if it supports vision (images)
  const [currentModel, currentProvider] = useAgentStore((s) => [
    sessionId ? agentSelectors.getAgentConfigBySessionId(sessionId)(s)?.model || 'gpt-4' : agentSelectors.currentAgentModel(s),
    sessionId ? agentSelectors.getAgentConfigBySessionId(sessionId)(s)?.provider || 'openai' : agentSelectors.currentAgentModelProvider(s),
  ]);
  const modelSupportsVision = useModelSupportVision(currentModel, currentProvider);
  
  // If model supports vision (images), allow all file uploads
  const canUpload = modelSupportsVision;

  return (
    <Upload
      accept={undefined} // Accept all file types
      beforeUpload={async (file) => {
        if (!canUpload) {
          return false; // Prevent upload if model doesn't support files or vision
        }
        await upload([file]);
        return false;
      }}
      disabled={!canUpload} // Disable if model doesn't support files or vision
      multiple={true}
      showUploadList={false}
    >
      <ActionIcon
        disabled={!canUpload}
        icon={FileUp}
        title={canUpload ? t('upload.clientMode.actionFiletip') : `Model "${currentModel}" does not support file uploads`}
        tooltipProps={{
          placement: 'bottom',
        }}
      />
    </Upload>
  );
});

export default FileUpload;
