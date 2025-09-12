import { memo } from 'react';

import DragUpload from '@/components/DragUpload';
import { useFileStore } from '@/store/file';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useModelSupportVision } from '@/hooks/useModelSupportVision';

import FileItemList from './FileList';

interface FilePreviewProps {
  sessionId?: string;
}

const FilePreview = memo<FilePreviewProps>(({ sessionId }) => {
  const [uploadFiles] = useFileStore((s) => [s.uploadChatFiles]);
  
  // Get current model and check if it supports vision (images)
  const [currentModel, currentProvider] = useAgentStore((s) => [
    sessionId ? agentSelectors.getAgentConfigBySessionId(sessionId)(s)?.model || 'gpt-4' : agentSelectors.currentAgentModel(s),
    sessionId ? agentSelectors.getAgentConfigBySessionId(sessionId)(s)?.provider || 'openai' : agentSelectors.currentAgentModelProvider(s),
  ]);
  const modelSupportsVision = useModelSupportVision(currentModel, currentProvider);
  
  // If model supports vision (images), allow all file uploads
  const canUpload = modelSupportsVision;

  const upload = async (fileList: FileList | File[] | undefined) => {
    if (!fileList || fileList.length === 0) return;

    // Check if model supports file uploads or vision
    if (!canUpload) {
      return; // Don't upload if model doesn't support files or vision
    }

    const files = Array.from(fileList);
    uploadFiles(files);
  };

  return (
    <>
      <DragUpload onUploadFiles={upload} />
      <FileItemList />
    </>
  );
});

export default FilePreview;
