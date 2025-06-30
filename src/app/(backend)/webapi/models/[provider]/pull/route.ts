import { checkAuth } from '@/app/(backend)/middleware/auth';
import { AgentRuntime, ChatCompletionErrorPayload } from '@/libs/model-runtime';
import { initAgentRuntimeWithUserPayload } from '@/server/modules/AgentRuntime';
import { ChatErrorType } from '@/types/fetch';
import { createErrorResponse } from '@/utils/errorResponse';

// Use Node.js runtime instead of Edge Runtime to avoid browser API issues
export const runtime = 'nodejs';

export const POST = checkAuth(async (req: Request, { params, jwtPayload }) => {
  const { provider } = await params;

  try {
    const agentRuntime: AgentRuntime = await initAgentRuntimeWithUserPayload(provider, jwtPayload);

    const data = await req.json();

    const result = await agentRuntime.pullModel(data);

    if (result) {
      return result;
    }

    return Response.json({ success: true });
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
