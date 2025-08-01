import {
  CodeOutlined,
  CustomerServiceOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileZipOutlined,
  FolderFilled,
  PlayCircleOutlined,
} from '@ant-design/icons';
import React, { memo } from 'react';

import { mimeTypeMap } from './config';

interface FileListProps {
  fileName: string;
  fileType?: string;
  isDirectory?: boolean;
  size?: number;
  variant?: 'raw' | 'file' | 'folder';
}

const getFileIcon = (fileName: string, size?: number) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const iconStyle = { fontSize: size || 16 };

  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) {
    return <FileImageOutlined style={iconStyle} />;
  }

  // Document files
  if (['pdf'].includes(ext)) {
    return <FilePdfOutlined style={iconStyle} />;
  }

  if (['doc', 'docx'].includes(ext)) {
    return <FileWordOutlined style={iconStyle} />;
  }

  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileExcelOutlined style={iconStyle} />;
  }

  if (['ppt', 'pptx'].includes(ext)) {
    return <FilePptOutlined style={iconStyle} />;
  }

  // Text files
  if (['txt', 'md', 'readme'].includes(ext)) {
    return <FileTextOutlined style={iconStyle} />;
  }

  // Code files
  if (
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'html',
      'css',
      'scss',
      'json',
      'xml',
      'yaml',
      'yml',
      'py',
      'java',
      'cpp',
      'c',
      'php',
      'rb',
      'go',
      'rs',
      'swift',
    ].includes(ext)
  ) {
    return <CodeOutlined style={iconStyle} />;
  }

  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <FileZipOutlined style={iconStyle} />;
  }

  // Video files
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'].includes(ext)) {
    return <PlayCircleOutlined style={iconStyle} />;
  }

  // Audio files
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
    return <CustomerServiceOutlined style={iconStyle} />;
  }

  // Default file icon
  return <FileOutlined style={iconStyle} />;
};

const FileIcon = memo<FileListProps>(({ fileName, size, isDirectory }) => {
  const iconStyle = { fontSize: size || 16 };

  if (isDirectory) {
    return <FolderFilled style={{ ...iconStyle, color: '#faad14' }} />;
  }

  return getFileIcon(fileName, size);
});

export default FileIcon;
