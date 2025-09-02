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
    // ============  1. init chat model   ============ //

    const data = (await req.json()) as ChatStreamPayload;

    const subscriptionInfo = (data as any).subscription;

    let agentRuntime: AgentRuntime;
    if (createRuntime) {
      agentRuntime = createRuntime(jwtPayload);
    } else {
      agentRuntime = await initAgentRuntimeWithUserPayload(
        provider,
        jwtPayload,
        {},
        subscriptionInfo,
        data?.model
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

    const model = cleanData?.model;
    // console.log(subscriptionInfo, '[SUBSCRIPTION INFO]')
    // console.log(model, '[MODEL]')

    if (subscriptionInfo && model == "openrouter/auto") {
      cleanData.model = "anthropic/claude-3.5-haiku"
      return await agentRuntime.chat(cleanData, {
        user: jwtPayload.userId,
        ...traceOptions,
        signal: req.signal,
      });
    } else if (!subscriptionInfo && model == "openrouter/auto") {
      cleanData.model = "qwen/qwen3-14b:free"
      return await agentRuntime.chat(cleanData, {
        user: jwtPayload.userId,
        ...traceOptions,
        signal: req.signal,
      });
    }
    else {
      return await agentRuntime.chat(cleanData, {
        user: jwtPayload.userId,
        ...traceOptions,
        signal: req.signal,
      });
    }
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
