interface v3generalconfig {
  apikey?: string;
  enabled: boolean;
  endpoint?: string;
}

export interface v3openaiconfig {
  openai_api_key: string;
  azureapiversion?: string;
  custommodelname?: string;
  enabled: boolean;
  endpoint?: string;
  useazure?: boolean;
}

export interface v3legacyconfig {
  apikey?: string;
  custommodelname?: string;
  enabled?: boolean;
  enabledmodels: string[];
  endpoint?: string;
}

export interface v3llmconfig {
  bedrock: any;
  google: v3generalconfig;
  ollama: v3legacyconfig;
  openai: v3openaiconfig;
  openrouter: v3legacyconfig;
  togetherai: v3legacyconfig;
}

/**
 * 配置设置
 */
export interface v3settings {
  defaultagent: any;
  fontsize: number;
  language: string;
  languagemodel?: partial<v3llmconfig>;
  neutralcolor?: string;
  password: string;
  primarycolor?: string;
  sync: any;
  thememode: string;
  tool: any;
  tts: any;
}

export interface v3configstate {
  settings?: v3settings;
}
