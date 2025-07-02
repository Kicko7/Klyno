export interface JinaSearchParameters {
  q: string;
}

export interface JinaUsage {
  tokens: number;
}

export interface JinaMeta {
  usage: JinaUsage;
}

export interface JinaData {
  content?: string;
  description?: string;
  title: string;
  url: string;
  usage?: JinaUsage;
}

export interface JinaResponse {
  code?: number;
  data: JinaData[];
  meta?: JinaMeta;
  status?: number;
}
