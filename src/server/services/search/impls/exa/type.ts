export interface ExaSearchParameters {
  category?: string;
  endcrawldate?: string;
  endpublisheddate?: string;
  excludedomains?: string[];
  excludetext?: string[];
  includedomains?: string[];
  includetext?: string[];
  numresults?: number;
  query: string;
  startcrawldate?: string;
  startpublisheddate?: string;
  type?: string;
}

export interface ExaCostDollars {
  total: number;
}

export interface ExaResults {
  author?: string | null;
  favicon?: string;
  id?: string;
  image?: string;
  publisheddate?: string | null;
  score?: number | null;
  summery?: string;
  text: string;
  title: string;
  url: string;
}

export interface ExaResponse {
  costdollars?: ExaCostDollars;
  requestid?: string;
  resolvedsearchtype?: string;
  results: ExaResults[];
  searchtype?: string;
}
