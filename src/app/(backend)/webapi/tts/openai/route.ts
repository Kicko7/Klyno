import { checkAuth } from '@/app/(backend)/middleware/auth';
import { AgentRuntime, ChatCompletionErrorPayload } from '@/libs/model-runtime';
import { initAgentRuntimeWithUserPayload } from '@/server/modules/AgentRuntime';
import { ChatErrorType } from '@/types/fetch';
import { createErrorResponse } from '@/utils/errorResponse';

// Use Node.js runtime instead of Edge Runtime to avoid browser API issues
export const runtime = 'nodejs';

export const preferredRegion = [
  'arn1',
  'bom1',
  'cdg1',
  'cle1',
  'cpt1',
  'dub1',
  'fra1',
  'gru1',
  'hnd1',
  'iad1',
  'icn1',
  'kix1',
  'lhr1',
  'pdx1',
  'sfo1',
  'sin1',
  'syd1',
];

export const POST = checkAuth(async (req: Request, { jwtPayload }) => {
  try {
    const agentRuntime: AgentRuntime = await initAgentRuntimeWithUserPayload('openai', jwtPayload);

    const data = await req.json();

    const result = await agentRuntime.textToSpeech(data);

    if (result instanceof Response) {
      return result;
    }

    // If result is ArrayBuffer, convert to Response
    return new Response(result, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;

    console.error(`Route: [openai-tts] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider: 'openai' });
  }
});
