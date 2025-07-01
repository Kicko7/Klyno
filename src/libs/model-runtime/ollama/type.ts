/**
 * @description images for ollama vision models (https://ollama.com/blog/vision-models)
 */
export interface ollamamessage {
  content: string;
  images?: string[];
  role: string;
}
