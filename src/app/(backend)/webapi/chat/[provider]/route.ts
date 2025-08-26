import { checkAuth } from '@/app/(backend)/middleware/auth';
import {
  AGENT_RUNTIME_ERROR_SET,
  AgentRuntime,
  ChatCompletionErrorPayload,
} from '@/libs/model-runtime';
import { createTraceOptions, initAgentRuntimeWithUserPayload } from '@/server/modules/AgentRuntime';
import { SubscriptionManager } from '@/server/services/subscriptions/subscriptionManager';
import { ChatErrorType } from '@/types/fetch';
import { ChatStreamPayload } from '@/types/openai/chat';
import { createErrorResponse } from '@/utils/errorResponse';
import { getTracePayload } from '@/utils/trace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = checkAuth(async (req: Request, { params, jwtPayload, createRuntime }) => {
  const { provider } = await params;

  try {
    // Now you can use your customField here

    // const subscriptionManager = new SubscriptionManager();
    // const user = jwtPayload.userId;
    // const subscription = await subscriptionManager.getUserSubscriptionInfo(user as string);

    // ============  1. init chat model   ============ //

    const data = (await req.json()) as ChatStreamPayload;
    console.log('🔍 Complete request body received:', JSON.stringify(data, null, 2));

    const subscriptionInfo = (data as any).subscription;
    console.log('🔍 Subscription field received:', subscriptionInfo);

    let agentRuntime: AgentRuntime;
    if (createRuntime) {
      agentRuntime = createRuntime(jwtPayload);
    } else {
      agentRuntime = await initAgentRuntimeWithUserPayload(
        provider,
        jwtPayload,
        {},
        subscriptionInfo,
      );
    }

    // ============  2. create chat completion   ============

    const tracePayload = getTracePayload(req);

    let traceOptions = {};
    // If user enable trace
    if (tracePayload?.enabled) {
      traceOptions = createTraceOptions(data, { provider, trace: tracePayload });
    }

    // Create clean data for AI provider (without subscription field)
    const cleanData = { ...data };
    delete (cleanData as any).subscription;

    // Note: Usage data is handled automatically by the model runtime factory
    // The factory will exclude usage for ChatGPT models and other models that don't support it
    return await agentRuntime.chat(cleanData, {
      user: jwtPayload.userId,
      ...traceOptions,
      signal: req.signal,
    });
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;

    const logMethod = AGENT_RUNTIME_ERROR_SET.has(errorType as string) ? 'warn' : 'error';
    console[logMethod](`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
});
