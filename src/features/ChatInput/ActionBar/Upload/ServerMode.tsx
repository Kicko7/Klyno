import { MenuProps, Tooltip } from '@lobehub/ui';
import { Upload } from 'antd';
import { css, cx } from 'antd-style';
import { FileUp, FolderUp, ImageUp, Paperclip } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useModelSupportVision } from '@/hooks/useModelSupportVision';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/slices/chat';
import { useFileStore } from '@/store/file';

import Action from '../components/Action';

const hotArea = css`
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: transparent;
  }
`;

interface FileUploadProps {
  sessionId?: string;
}

const FileUpload = memo<FileUploadProps>(({ sessionId }) => {
  const { t } = useTranslation('chat');

  const upload = useFileStore((s) => s.uploadChatFiles);

  const [model, provider] = useAgentStore((s) => [
    sessionId ? agentSelectors.getAgentConfigBySessionId(sessionId)(s)?.model || 'gpt-4' : agentSelectors.currentAgentModel(s),
    sessionId ? agentSelectors.getAgentConfigBySessionId(sessionId)(s)?.provider || 'openai' : agentSelectors.currentAgentModelProvider(s),
  ]);

  const canUploadImage = useModelSupportVision(model, provider);
  
  // If model supports vision (images), allow all file uploads
  const canUploadFiles = canUploadImage;

  const items: MenuProps['items'] = [
    {
      disabled: !canUploadImage,
      icon: ImageUp,
      key: 'upload-image',
      label: canUploadImage ? (
        <Upload
          accept={'image/*'}
          beforeUpload={async (file) => {
            await upload([file]);
            return false;
          }}
          multiple
          showUploadList={false}
        >
          <div className={cx(hotArea)}>{t('upload.action.imageUpload')}</div>
        </Upload>
      ) : (
        <Tooltip placement={'right'} title={t('upload.action.imageDisabled')}>
          <div className={cx(hotArea)}>{t('upload.action.imageUpload')}</div>
        </Tooltip>
      ),
    },
    {
      disabled: !canUploadFiles,
      icon: FileUp,
      key: 'upload-file',
      label: canUploadFiles ? (
        <Upload
          beforeUpload={async (file) => {
            if (!canUploadImage && file.type.startsWith('image')) return false;

            await upload([file]);

            return false;
          }}
          multiple
          showUploadList={false}
        >
          <div className={cx(hotArea)}>{t('upload.action.fileUpload')}</div>
        </Upload>
      ) : (
        <Tooltip placement={'right'} title={`Model "${model}" does not support file uploads`}>
          <div className={cx(hotArea)}>{t('upload.action.fileUpload')}</div>
        </Tooltip>
      ),
    },
    {
      disabled: !canUploadFiles,
      icon: FolderUp,
      key: 'upload-folder',
      label: canUploadFiles ? (
        <Upload
          beforeUpload={async (file) => {
            if (!canUploadImage && file.type.startsWith('image')) return false;

            await upload([file]);

            return false;
          }}
          directory
          multiple={true}
          showUploadList={false}
        >
          <div className={cx(hotArea)}>{t('upload.action.folderUpload')}</div>
        </Upload>
      ) : (
        <Tooltip placement={'right'} title={`Model "${model}" does not support file uploads`}>
          <div className={cx(hotArea)}>{t('upload.action.folderUpload')}</div>
        </Tooltip>
      ),
    },
  ];

  return (
    <Action
      dropdown={{
        menu: { items },
      }}
      icon={Paperclip}
      showTooltip={false}
      title={t('upload.action.tooltip')}
    />
  );
});

export default FileUpload;
