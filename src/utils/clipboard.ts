import { safeAppendChild, safeCreateElement, safeRemoveChild } from '@/utils/client/safeDOM';

const copyUsingFallback = (imageUrl: string) => {
  const img = new Image();
  img.addEventListener('load', function () {
    const canvas = safeCreateElement('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      console.error('Failed to create canvas element');
      return;
    }

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx!.drawImage(img, 0, 0);

    try {
      canvas.toBlob(function (blob) {
        // @ts-ignore
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(function () {
          console.log('Image copied to clipboard successfully using canvas and modern API');
        });
      });
    } catch {
      // 如果 toBlob 或 ClipboardItem 不被支持，使用 data URL
      const dataURL = canvas.toDataURL('image/png');
      const textarea = safeCreateElement('textarea') as HTMLTextAreaElement | null;
      if (!textarea) {
        console.error('Failed to create textarea element');
        return;
      }

      textarea.value = dataURL;
      safeAppendChild(document.body, textarea);
      textarea.select();

      document.execCommand('copy');

      safeRemoveChild(document.body, textarea);
    }
  });
  img.src = imageUrl;
};

const copyUsingModernAPI = async (imageUrl: string) => {
  try {
    const base64Response = await fetch(imageUrl);
    const blob = await base64Response.blob();
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
  } catch (error) {
    console.error('Failed to copy image using modern API:', error);
    copyUsingFallback(imageUrl);
  }
};

export const copyImageToClipboard = async (imageUrl: string) => {
  // 检查是否支持现代 Clipboard API
  if (navigator.clipboard && 'write' in navigator.clipboard) {
    await copyUsingModernAPI(imageUrl);
  } else {
    copyUsingFallback(imageUrl);
  }
};
