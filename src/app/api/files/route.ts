import { NextRequest, NextResponse } from 'next/server';

import { ServerService } from '@/services/file/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  // Extract query params as needed for your file fetching logic
  const params: any = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const serverFileService = new ServerService();
  const files = await serverFileService.getFiles(params);
  return NextResponse.json(files);
}
