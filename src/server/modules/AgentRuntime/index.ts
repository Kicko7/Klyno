import { getLLMConfig } from '@/config/llm';
import { JWTPayload } from '@/const/auth';
import { AgentRuntime, ModelProvider } from '@/libs/model-runtime';

import apiKeyManager from './apiKeyManager';

export * from './trace';

/**
 * Retrieves the options object from environment and apikeymanager
 * based on the provider and payload.
 *
 * @param provider - The model provider.
 * @param payload - The JWT payload.
 * @returns The options object.
 */
const getParamsFromPayload = (provider: string, payload: JWTPayload, params: any) => {
  const llmConfig = getLLMConfig() as Record<string, any>;
  console.log(params)

  // ✅ Universal subscription check
  const hasValidSubscription =
    params?.subscription && params?.currentCredits > 0;

  console.log(hasValidSubscription, 'has valid subscription');
  switch (provider) {
    default: {
      let upperProvider = provider.toUpperCase();

      if (!(`${upperProvider}_API_KEY` in llmConfig)) {
        upperProvider = ModelProvider.OpenAI.toUpperCase(); // fallback
      }

      const apiKey = apiKeyManager.pick(
        hasValidSubscription ? llmConfig[`${upperProvider}_API_KEY`] : payload?.apiKey, // fallback to user-provided
      );
      const baseURL = payload?.baseURL || process.env[`${upperProvider}_PROXY_URL`];

      return baseURL ? { apiKey, baseURL } : { apiKey };
    }

    case ModelProvider.Ollama: {
      const baseURL = payload?.baseURL || process.env.OLLAMA_PROXY_URL;
      return { baseURL };
    }

    case ModelProvider.Azure: {
      const { AZURE_API_KEY, AZURE_API_VERSION, AZURE_ENDPOINT } = llmConfig;
      const apiKey = apiKeyManager.pick(hasValidSubscription ? AZURE_API_KEY : payload?.apiKey);
      const baseURL = payload?.baseURL || AZURE_ENDPOINT;
      const apiVersion = payload?.azureApiVersion || AZURE_API_VERSION;
      return { apiKey, apiVersion, baseURL };
    }

    case ModelProvider.AzureAI: {
      const { AZUREAI_ENDPOINT, AZUREAI_ENDPOINT_KEY } = llmConfig;
      const apiKey = hasValidSubscription ? AZUREAI_ENDPOINT_KEY : payload?.apiKey;
      const baseURL = payload?.baseURL || AZUREAI_ENDPOINT;
      return { apiKey, baseURL };
    }

    case ModelProvider.Bedrock: {
      const { AWS_SECRET_ACCESS_KEY, AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SESSION_TOKEN } = llmConfig;
      let accessKeyId = hasValidSubscription ? AWS_ACCESS_KEY_ID : payload?.awsAccessKeyId;
      let accessKeySecret = hasValidSubscription
        ? AWS_SECRET_ACCESS_KEY
        : payload?.awsSecretAccessKey;
      let region = hasValidSubscription ? AWS_REGION : payload?.awsRegion;
      let sessionToken = hasValidSubscription ? AWS_SESSION_TOKEN : payload?.awsSessionToken;

      return { accessKeyId, accessKeySecret, region, sessionToken };
    }

    case ModelProvider.Cloudflare: {
      const { CLOUDFLARE_API_KEY, CLOUDFLARE_BASE_URL_OR_ACCOUNT_ID } = llmConfig;

      const apiKey = apiKeyManager.pick(
        hasValidSubscription ? CLOUDFLARE_API_KEY : payload?.apiKey,
      );

      const baseURLOrAccountID = hasValidSubscription
        ? CLOUDFLARE_BASE_URL_OR_ACCOUNT_ID
        : payload?.cloudflareBaseURLOrAccountID;

      return { apiKey, baseURLOrAccountID };
    }

    case ModelProvider.GiteeAI: {
      const { GITEE_AI_API_KEY } = llmConfig;
      const apiKey = apiKeyManager.pick(hasValidSubscription ? GITEE_AI_API_KEY : payload?.apiKey);
      return { apiKey };
    }

    case ModelProvider.OpenRouter: {
      const { OPENROUTER_API_KEY } = llmConfig;
      const apiKey = apiKeyManager.pick(
        hasValidSubscription ? OPENROUTER_API_KEY : payload?.apiKey,
      );
      return { apiKey };
    }

    case ModelProvider.Github: {
      const { GITHUB_TOKEN } = llmConfig;
      const apiKey = apiKeyManager.pick(hasValidSubscription ? GITHUB_TOKEN : payload?.apiKey);
      return { apiKey };
    }

    case ModelProvider.TencentCloud: {
      const { TENCENT_CLOUD_API_KEY } = llmConfig;
      const apiKey = apiKeyManager.pick(
        hasValidSubscription ? TENCENT_CLOUD_API_KEY : payload?.apiKey,
      );
      return { apiKey };
    }
  }
};

/**
 * Initializes the agent runtime with the user payload in backend
 * @param provider - The provider name.
 * @param payload - The JWT payload.
 * @param params
 * @returns A promise that resolves when the agent runtime is initialized.
 */
export const initAgentRuntimeWithUserPayload = (
  provider: string,
  payload: JWTPayload,
  params: any = {},
  subscription?: any,
) => {
  return AgentRuntime.initializeWithProvider(provider, {
    ...getParamsFromPayload(provider, payload, subscription),
    ...params,
  });
};
