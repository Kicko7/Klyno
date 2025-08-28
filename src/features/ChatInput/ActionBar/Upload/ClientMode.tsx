import { ActionIcon } from '@lobehub/ui';
import { Upload } from 'antd';
import { FileUp } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFileStore } from '@/store/file';

const FileUpload = memo(() => {
  const { t } = useTranslation('chat');

  const upload = useFileStore((s) => s.uploadChatFiles);

  return (
    <Upload
      accept={undefined} // Accept all file types
      beforeUpload={async (file) => {
        await upload([file]);
        return false;
      }}
      disabled={false} // Always enabled for all models
      multiple={true}
      showUploadList={false}
    >
      <ActionIcon
        disabled={false}
        icon={FileUp}
        title={t('upload.clientMode.actionFiletip')}
        tooltipProps={{
          placement: 'bottom',
        }}
      />
    </Upload>
  );
});

export default FileUpload;
