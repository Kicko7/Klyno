import { NextResponse } from 'next/server';

import { getCacheFiles } from '@/features/DevPanel/CacheViewer/getCacheEntries';

export async function GET() {
  const files = await getCacheFiles();
  return NextResponse.json(files);
}
