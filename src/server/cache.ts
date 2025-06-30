'use server';

import { getCacheFiles } from '@/features/DevPanel/CacheViewer/getCacheEntries';
import type { NextCacheFileData } from '@/features/DevPanel/CacheViewer/schema';

export async function getCacheFilesAction(): Promise<NextCacheFileData[]> {
  try {
    return await getCacheFiles();
  } catch (error) {
    console.error('Failed to get cache files:', error);
    return [];
  }
}
