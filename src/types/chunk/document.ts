export interface chunkdocument {
  compositeid?: string;
  id?: string;
  index: number;
  metadata: Record<string, unknown>;
  parentid?: string;
  text: string;
  type: string;
}

export interface DocumentChunk {
  content: string;
  metadata: Record<string, unknown>;
  score?: number;
}
