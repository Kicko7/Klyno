import { ChatModelCard } from '@/types/llm';

import { V3Settings } from './v3';

export interface V4ProviderConfig {
  apiKey?: string;
  customModelCards?: ChatModelCard[];
  enabled?: boolean;
  /**
   * enabled models id
   */
  enabledModels?: string[] | null;
  endpoint?: string;
}
export interface V4AzureOpenAIConfig extends V4ProviderConfig {
  apiVersion?: string;
}

export interface V4LLMConfig {
  azure?: V4AzureOpenAIConfig;
  ollama?: V4ProviderConfig;
  openai?: V4ProviderConfig;
  openrouter?: V4ProviderConfig;
  togetherai?: V4ProviderConfig;
}

/**
 * 配置设置
 */
export interface V4Settings extends Omit<V3Settings, 'languageModel'> {
  languageModel?: V4LLMConfig;
}

export interface V4ConfigState {
  settings?: V4Settings;
}
