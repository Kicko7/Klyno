export interface filesconfigitem {
  model: string;
  provider: string;
}

export interface filesconfig {
  embeddingmodel: filesconfigitem;
  querymode: string;
  rerankermodel: filesconfigitem;
}
