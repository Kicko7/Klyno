import { isServerMode } from '@/const/version';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';

import ClientMode from './ClientMode';
import ServerMode from './ServerMode';

interface UploadProps {
  sessionId?: string;
}

const Upload = ({ sessionId }: UploadProps) => {
  const { enableKnowledgeBase } = useServerConfigStore(featureFlagsSelectors);
  return isServerMode && enableKnowledgeBase ? <ServerMode sessionId={sessionId} /> : <ClientMode sessionId={sessionId} />;
};

export default Upload;
