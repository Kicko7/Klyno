export interface V3GeneralConfig {
  apikey?: string;
  enabled: boolean;
  endpoint?: string;
}

export interface V3OpenAIConfig {
  azureapiversion?: string;
  custommodelname?: string;
  enabled: boolean;
  endpoint?: string;
  openai_api_key: string;
  useazure?: boolean;
}

export interface V3LegacyConfig {
  apikey?: string;
  custommodelname?: string;
  enabled?: boolean;
  enabledmodels: string[];
  endpoint?: string;
}

export interface V3LLMConfig {
  bedrock: any;
  google: V3GeneralConfig;
  ollama: V3LegacyConfig;
  openai: V3OpenAIConfig;
  openrouter: V3LegacyConfig;
  togetherai: V3LegacyConfig;
}

/**
 * 配置设置
 */
export interface V3Settings {
  defaultagent: any;
  fontsize: number;
  language: string;
  languagemodel?: Partial<V3LLMConfig>;
  neutralcolor?: string;
  password: string;
  primarycolor?: string;
  sync: any;
  thememode: string;
  tool: any;
  tts: any;
}

export interface V3ConfigState {
  settings?: V3Settings;
}
