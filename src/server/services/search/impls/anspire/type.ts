export interface AnspireSearchParameters {
  fromtime?: string;
  insite?: string;
  mode?: number;
  query: string;
  top_k?: number;
  totime?: string;
}

export interface AnspireResults {
  content?: string;
  score?: number;
  title: string;
  url: string;
}

export interface AnspireResponse {
  query?: string;
  results?: AnspireResults[];
  uuid?: string;
}
