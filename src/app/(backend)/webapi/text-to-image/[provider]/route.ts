import { checkAuth } from '@/app/(backend)/middleware/auth';
import { AgentRuntime, ChatCompletionErrorPayload } from '@/libs/model-runtime';
import { TextToImagePayload } from '@/libs/model-runtime/types';
import { initAgentRuntimeWithUserPayload } from '@/server/modules/AgentRuntime';
import { ChatErrorType } from '@/types/fetch';
import { createErrorResponse } from '@/utils/errorResponse';

// Use Node.js runtime instead of Edge Runtime to avoid browser API issues
export const runtime = 'nodejs';

export const preferredRegion = [
  'bom1',
  'cle1',
  'cpt1',
  'gru1',
  'hnd1',
  'iad1',
  'icn1',
  'kix1',
  'pdx1',
  'sfo1',
  'sin1',
  'syd1',
];

// return NextResponse.json(
//   {
//     body: {
//       endpoint: 'https://ai****ix.com/v1',
//       error: {
//         code: 'content_policy_violation',
//         message:
//           'Your request was rejected as a result of our safety system. Image descriptions generated from your prompt may contain text that is not allowed by our safety system. If you believe this was done in error, your request may succeed if retried, or by adjusting your prompt.',
//         param: null,
//         type: 'invalid_request_error',
//       },
//       provider: 'openai',
//     },
//     errorType: 'OpenAIBizError',
//   },
//   { status: 400 },
// );

export const POST = checkAuth(async (req: Request, { params, jwtPayload }) => {
  const { provider } = await params;

  try {
    const agentRuntime: AgentRuntime = await initAgentRuntimeWithUserPayload(provider, jwtPayload);

    const data = (await req.json()) as TextToImagePayload;

    const images = await agentRuntime.textToImage(data);

    return Response.json(images);
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;
    // track the error at server side
    console.error(`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
});
