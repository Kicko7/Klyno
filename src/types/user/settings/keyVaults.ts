export interface openaicompatiblekeyvault {
  apikey?: string;
  baseurl?: string;
}

export interface azureopenaikeyvault {
  apikey?: string;
  apiversion?: string;
  baseurl?: string;

  /**
   * @deprecated
   */
  endpoint?: string;
}

export interface awsbedrockkeyvault {
  accesskeyid?: string;
  region?: string;
  secretaccesskey?: string;
  sessiontoken?: string;
}

export interface cloudflarekeyvault {
  apikey?: string;
  baseurloraccountid?: string;
}

export interface searchenginekeyvaults {
  searchxng?: {
    apikey?: string;
    baseurl?: string;
  };
}

export interface userkeyvaults extends searchenginekeyvaults {
  ai21?: openaicompatiblekeyvault;
  ai360?: openaicompatiblekeyvault;
  anthropic?: openaicompatiblekeyvault;
  azure?: azureopenaikeyvault;
  azureai?: azureopenaikeyvault;
  baichuan?: openaicompatiblekeyvault;
  bedrock?: awsbedrockkeyvault;
  cloudflare?: cloudflarekeyvault;
  cohere?: openaicompatiblekeyvault;
  deepseek?: openaicompatiblekeyvault;
  fireworksai?: openaicompatiblekeyvault;
  giteeai?: openaicompatiblekeyvault;
  github?: openaicompatiblekeyvault;
  google?: openaicompatiblekeyvault;
  groq?: openaicompatiblekeyvault;
  higress?: openaicompatiblekeyvault;
  huggingface?: openaicompatiblekeyvault;
  hunyuan?: openaicompatiblekeyvault;
  infiniai?: openaicompatiblekeyvault;
  internlm?: openaicompatiblekeyvault;
  jina?: openaicompatiblekeyvault;
  lmstudio?: openaicompatiblekeyvault;
  lobehub?: any;
  minimax?: openaicompatiblekeyvault;
  mistral?: openaicompatiblekeyvault;
  modelscope?: openaicompatiblekeyvault;
  moonshot?: openaicompatiblekeyvault;
  novita?: openaicompatiblekeyvault;
  nvidia?: openaicompatiblekeyvault;
  ollama?: openaicompatiblekeyvault;
  openai?: openaicompatiblekeyvault;
  openrouter?: openaicompatiblekeyvault;
  password?: string;
  perplexity?: openaicompatiblekeyvault;
  ppio?: openaicompatiblekeyvault;
  qiniu?: openaicompatiblekeyvault;
  qwen?: openaicompatiblekeyvault;
  sambanova?: openaicompatiblekeyvault;
  search1api?: openaicompatiblekeyvault;
  sensenova?: openaicompatiblekeyvault;
  siliconcloud?: openaicompatiblekeyvault;
  spark?: openaicompatiblekeyvault;
  stepfun?: openaicompatiblekeyvault;
  taichu?: openaicompatiblekeyvault;
  tencentcloud?: openaicompatiblekeyvault;
  togetherai?: openaicompatiblekeyvault;
  upstage?: openaicompatiblekeyvault;
  v0?: openaicompatiblekeyvault;
  vertexai?: openaicompatiblekeyvault;
  vllm?: openaicompatiblekeyvault;
  volcengine?: openaicompatiblekeyvault;
  wenxin?: openaicompatiblekeyvault;
  xai?: openaicompatiblekeyvault;
  xinference?: openaicompatiblekeyvault;
  zeroone?: openaicompatiblekeyvault;
  zhipu?: openaicompatiblekeyvault;
}
