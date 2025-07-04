import { safeAppendChild, safeCreateElement, safeRemoveChild } from '@/utils/client/safeDOM';

export const exportFile = (content: string, filename?: string) => {
  // 创建一个 Blob 对象
  const blob = new Blob([content], { type: 'plain/text' });

  // 创建一个 URL 对象，用于下载
  const url = URL.createObjectURL(blob);

  // 创建一个 <a> 元素，设置下载链接和文件名
  const a = safeCreateElement('a') as HTMLAnchorElement | null;
  if (!a) {
    console.error('Failed to create anchor element for file export');
    return;
  }

  a.href = url;
  a.download = filename || 'file.txt';

  // 触发 <a> 元素的点击事件，开始下载
  safeAppendChild(document.body, a);
  a.click();

  // 下载完成后，清除 URL 对象
  URL.revokeObjectURL(url);
  safeRemoveChild(document.body, a);
};

export const exportJSONFile = (data: object, fileName: string) => {
  // 创建一个 Blob 对象
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });

  // 创建一个 URL 对象，用于下载
  const url = URL.createObjectURL(blob);

  // 创建一个 <a> 元素，设置下载链接和文件名
  const a = safeCreateElement('a') as HTMLAnchorElement | null;
  if (!a) {
    console.error('Failed to create anchor element for JSON file export');
    return;
  }

  a.href = url;
  a.download = fileName;

  // 触发 <a> 元素的点击事件，开始下载
  safeAppendChild(document.body, a);
  a.click();

  // 下载完成后，清除 URL 对象
  URL.revokeObjectURL(url);
  safeRemoveChild(document.body, a);
};
