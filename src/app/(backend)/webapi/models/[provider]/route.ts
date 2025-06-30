import { checkAuth } from '@/app/(backend)/middleware/auth';
import { AgentRuntime, ModelProvider } from '@/libs/model-runtime';
import { initAgentRuntimeWithUserPayload } from '@/server/modules/AgentRuntime';
import { ChatErrorType, ErrorType } from '@/types/fetch';
import { createErrorResponse } from '@/utils/errorResponse';

// Use Node.js runtime instead of Edge Runtime to avoid browser API issues
export const runtime = 'nodejs';

const noNeedAPIKey = (provider: string) => [ModelProvider.OpenRouter].includes(provider as any);

export const GET = checkAuth(async (req: Request, { params, jwtPayload }) => {
  const { provider } = await params;

  try {
    const hasDefaultApiKey = jwtPayload.apiKey || 'dont-need-api-key-for-model-list';

    const agentRuntime: AgentRuntime = await initAgentRuntimeWithUserPayload(provider, {
      ...jwtPayload,
      apiKey: noNeedAPIKey(provider) ? hasDefaultApiKey : jwtPayload.apiKey,
    });

    const list = await agentRuntime.models();

    return Response.json(list);
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as { [key: string]: unknown; error?: unknown; errorType?: ErrorType };

    const error = errorContent || e;
    // track the error at server side
    console.error(`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
});
