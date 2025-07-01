export interface texttospeechpayload {
  input: string;
  model: string;
  voice: string;
}

export interface texttospeechoptions {
  headers?: record<string, any>;
  signal?: abortsignal;

  /**
   * userId for the embeddings
   */
  user?: string;
}
