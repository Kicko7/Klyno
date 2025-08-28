import { memo } from 'react';

import DragUpload from '@/components/DragUpload';
import { useFileStore } from '@/store/file';

import FileItemList from './FileList';

const FilePreview = memo(() => {
  const [uploadFiles] = useFileStore((s) => [s.uploadChatFiles]);

  const upload = async (fileList: FileList | File[] | undefined) => {
    if (!fileList || fileList.length === 0) return;

    // Allow all file types for all models - no filtering based on model capabilities
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
