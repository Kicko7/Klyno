import { safeAppendChild, safeCreateElement, safeRemoveChild } from '@/utils/client/safeDOM';

export const downloadFile = async (url: string, fileName: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();

    const blobUrl = window.URL.createObjectURL(blob);
    const link = safeCreateElement('a');
    if (!link) {
      console.error('Failed to create anchor element for file download');
      window.open(url);
      return;
    }
    
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    safeAppendChild(document.body, link);
    link.click();
    safeRemoveChild(document.body, link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.log('Download failed:', error);
    window.open(url);
  }
};
