import { checkAuth } from '@/app/(backend)/middleware/auth';
import { ChatErrorType } from '@/types/fetch';
import { createErrorResponse } from '@/utils/errorResponse';

// Use Node.js runtime instead of Edge Runtime to avoid browser API issues
export const runtime = 'nodejs';

export const POST = checkAuth(async (req: Request, { jwtPayload: _jwtPayload }) => {
  try {
    const data = await req.json();

    // TODO: Implement Microsoft TTS functionality
    console.log('Microsoft TTS data:', data);

    return Response.json({ success: true });
  } catch (e) {
    const error = e as Error;
    console.error('Microsoft TTS error:', error);

    return createErrorResponse(ChatErrorType.InternalServerError, { error });
  }
});
