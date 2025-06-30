import OpenAI from 'openai';

import { checkAuth } from '@/app/(backend)/middleware/auth';
import { ChatErrorType } from '@/types/fetch';
import { createErrorResponse } from '@/utils/errorResponse';

// Use Node.js runtime instead of Edge Runtime to avoid browser API issues
export const runtime = 'nodejs';

export const POST = checkAuth(async (req: Request, { jwtPayload }) => {
  try {
    if (!jwtPayload.apiKey) {
      return createErrorResponse(ChatErrorType.InvalidUserKey, {
        error: new Error('No API key provided'),
        provider: 'openai',
      });
    }

    const openai = new OpenAI({
      apiKey: jwtPayload.apiKey,
      baseURL: jwtPayload.baseURL,
    });

    const formData = await req.formData();
    const audio = formData.get('audio') as File;

    if (!audio) {
      return createErrorResponse(ChatErrorType.BadRequest, {
        error: new Error('No audio file provided'),
        provider: 'openai',
      });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
    });

    return Response.json({ text: transcription.text });
  } catch (e) {
    const error = e as Error;
    console.error('STT error:', error);

    return createErrorResponse(ChatErrorType.InternalServerError, {
      error,
      provider: 'openai',
    });
  }
});
