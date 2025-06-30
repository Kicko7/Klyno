/**
 * Server-compatible image-to-base64 utility for Node.js/edge environments
 * This version uses Node.js native APIs instead of browser APIs
 */
import { base64EncodeFromBytes } from '@/utils/base64';
import { isOnServerSide } from '@/utils/env';

export interface ImageToBase64Result {
  base64: string;
  mimeType: string;
}

/**
 * Convert an image URL to base64 using Node.js native APIs
 * This function is safe to use in server/edge environments
 */
export const imageUrlToBase64Server = async (imageUrl: string): Promise<ImageToBase64Result> => {
  if (!isOnServerSide) {
    throw new Error('imageUrlToBase64Server can only be used in server environments.');
  }

  try {
    // Use Node.js native fetch (available in Node 18+ and edge runtime)
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Convert to base64 using Node.js Buffer
    const base64 = base64EncodeFromBytes(new Uint8Array(arrayBuffer));

    return {
      base64,
      mimeType: contentType,
    };
  } catch (error) {
    throw new Error(
      `Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Convert a base64 string to a data URL
 */
export const base64ToDataUrl = (base64: string, mimeType: string): string => {
  return `data:${mimeType};base64,${base64}`;
};

/**
 * Check if a string is a valid data URL
 */
export const isDataUrl = (url: string): boolean => {
  return url.startsWith('data:');
};

/**
 * Extract base64 and mime type from a data URL
 */
export const parseDataUrl = (dataUrl: string): ImageToBase64Result | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return {
    base64: match[2],
    mimeType: match[1],
  };
};
