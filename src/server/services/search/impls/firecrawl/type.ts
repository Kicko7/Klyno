export interface FirecrawlScrapeOptions {
  formats: string[];
}

export interface FirecrawlSearchParameters {
  country?: string;
  lang?: string;
  limit?: number;
  query: string;
  scrapeoptions?: FirecrawlScrapeOptions;
  tbs?: string;
  timeout?: number;
}

export interface FirecrawlMetadata {
  description?: string;
  sourceurl?: string;
  statuscode?: number;
  title: string;
}

export interface FirecrawlData {
  description?: string;
  html?: string;
  links?: string[];
  markdown?: string;
  metadata?: FirecrawlMetadata;
  title?: string;
  url: string;
}

export interface FirecrawlResponse {
  data: FirecrawlData[];
  success?: boolean;
}
