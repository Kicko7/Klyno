import OpenRouterModels from '@/config/aiModels/openrouter';
import type { ChatModelCard } from '@/types/llm';

import { ModelProvider } from '../types';
import { processMultiProviderModelList } from '../utils/modelParse';
import { createOpenAICompatibleRuntime } from '../utils/openaiCompatibleFactory';
import { OpenRouterModelCard, OpenRouterModelExtraInfo, OpenRouterReasoning } from './type';

const formatPrice = (price: string) => {
  if (price === '-1') return undefined;
  return Number((Number(price) * 1e6).toPrecision(5));
};

export const LobeOpenRouterAI = createOpenAICompatibleRuntime({
  baseURL: 'https://openrouter.ai/api/v1',
  chatCompletion: {
    handlePayload: (payload) => {
      const { thinking, model, max_tokens } = payload;

      let reasoning: OpenRouterReasoning = {};

      if (thinking?.type === 'enabled') {
        const modelConfig = OpenRouterModels.find((m) => m.id === model);
        const defaultMaxOutput = modelConfig?.maxOutput;

        const getMaxTokens = () => {
          if (max_tokens) return max_tokens;
          if (defaultMaxOutput) return defaultMaxOutput;
          return undefined;
        };

        const maxTokens = getMaxTokens() || 32_000;

        reasoning = {
          max_tokens: thinking?.budget_tokens
            ? Math.min(thinking.budget_tokens, maxTokens - 1)
            : 1024,
        };
      }

      const finalPayload = {
        ...payload,
        model: payload.enabledSearch ? `${payload.model}:online` : payload.model,
        reasoning,
        stream: payload.stream ?? true,
        // Force standard streaming mode
        apiMode: undefined,
        // Properly configure streaming options for OpenRouter
        ...(payload.stream && {
          stream_options: {
            include_usage: true,
          },
        }),
      } as any;

      // Remove these problematic properties
      delete finalPayload.usage;
      delete finalPayload.include_usage;
      delete finalPayload.extra_headers;

      return finalPayload;
    },
    excludeUsage: false,
    // Add comprehensive stream debugging
    handleStream: (stream, options) => {
      // Import OpenAIStream directly to ensure we use the right one
      const { OpenAIStream } = require('../../model-runtime/utils/streams/openai/openai');
      
      // Since OpenRouter provides an async iterable stream, we need to handle it differently
      if (stream && Symbol.asyncIterator in stream) {
        // Convert async iterable to ReadableStream without complex transformation
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              let usageData: any = null;
              
              // Process the async iterable stream
              for await (const chunk of stream as AsyncIterable<any>) {
                // Check if chunk contains usage data
                if (chunk && typeof chunk === 'object' && chunk.usage) {
                  usageData = chunk.usage;
                  
                  // Send chunk without usage data
                  const cleanChunk = { ...chunk };
                  delete cleanChunk.usage;
                  controller.enqueue(cleanChunk);
                } else {
                  // Send chunk as-is
                  controller.enqueue(chunk);
                }
              }
              
              // Send usage data as final chunk if we found any
              if (usageData) {
                // Format usage chunk to match what transformOpenAIStream expects
                const usageChunk = {
                  id: 'usage-chunk',
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  choices: [], // Empty choices array to satisfy the transformer
                  usage: usageData, // The actual usage data
                  type: 'usage' // Custom type for identification
                };
                controller.enqueue(usageChunk);
              }
              
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });
        
        return OpenAIStream(readableStream, {
          ...options,
          callbacks: {
            ...options?.callbacks,
            onStart: () => {
              options?.callbacks?.onStart?.();
            },
            onCompletion: (completion: any) => {
              options?.callbacks?.onCompletion?.(completion);
            },
            onText: (content: string) => {
              options?.callbacks?.onText?.(content);
            },
            onUsage: (usage: any) => {
              if (options?.callbacks?.onUsage) {
                options.callbacks.onUsage(usage);
              }
            },
            onFinal: (completion: any) => {
              options?.callbacks?.onFinal?.(completion);
            },
          },
        });
      } else {
        // Fallback: use standard OpenAIStream
        return OpenAIStream(stream, {
          ...options,
          callbacks: {
            ...options?.callbacks,
            onStart: () => {
              options?.callbacks?.onStart?.();
            },
            onCompletion: (completion: any) => {
              options?.callbacks?.onCompletion?.(completion);
            },
            onText: (content: string) => {
              options?.callbacks?.onText?.(content);
            },
            onUsage: (usage: any) => {
              if (options?.callbacks?.onUsage) {
                options.callbacks.onUsage(usage);
              }
            },
            onFinal: (completion: any) => {
              options?.callbacks?.onFinal?.(completion);
            },
          },
        });
      }
    },
  },
  constructorOptions: {
    defaultHeaders: {
      'HTTP-Referer': 'https://chat-preview.lobehub.com',
      'X-Title': 'Lobe Chat',
    },
  },
  debug: {
    chatCompletion: () => process.env.DEBUG_OPENROUTER_CHAT_COMPLETION === '1',
  },
  models: async ({ client }) => {
    const modelsPage = (await client.models.list()) as any;
    const modelList: OpenRouterModelCard[] = modelsPage.data;

    const modelsExtraInfo: OpenRouterModelExtraInfo[] = [];
    try {
      const response = await fetch('https://openrouter.ai/api/frontend/models');
      if (response.ok) {
        const data = await response.json();
        modelsExtraInfo.push(...data['data']);
      }
    } catch (error) {
      console.error('Failed to fetch OpenRouter frontend models:', error);
    }

    const baseModels = await processMultiProviderModelList(modelList);

    return baseModels
      .map((baseModel) => {
        const model = modelList.find((m) => m.id === baseModel.id);
        const extraInfo = modelsExtraInfo.find(
          (m) => m.slug.toLowerCase() === baseModel.id.toLowerCase(),
        );

        if (!model) return baseModel;

        return {
          ...baseModel,
          contextWindowTokens: model.context_length,
          description: model.description,
          displayName: model.name,
          functionCall:
            baseModel.functionCall ||
            model.description.includes('function calling') ||
            model.description.includes('tools') ||
            extraInfo?.endpoint?.supports_tool_parameters ||
            false,
          maxTokens:
            typeof model.top_provider.max_completion_tokens === 'number'
              ? model.top_provider.max_completion_tokens
              : undefined,
          pricing: {
            input: formatPrice(model.pricing.prompt),
            output: formatPrice(model.pricing.completion),
          },
          reasoning: baseModel.reasoning || extraInfo?.endpoint?.supports_reasoning || false,
          releasedAt: new Date(model.created * 1000).toISOString().split('T')[0],
          vision: baseModel.vision || model.architecture.modality.includes('image') || false,
        };
      })
      .filter(Boolean) as ChatModelCard[];
  },
  provider: ModelProvider.OpenRouter,
});