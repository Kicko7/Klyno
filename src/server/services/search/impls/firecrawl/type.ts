interface firecrawlscrapeoptions {
  formats: string[];
}

export interface firecrawlsearchparameters {
  country?: string;
  lang?: string;
  limit?: number;
  query: string;
  scrapeoptions?: firecrawlscrapeoptions;
  tbs?: string;
  timeout?: number;
}

interface firecrawlmetadata {
  description?: string;
  sourceurl?: string;
  statuscode?: number;
  title: string;
}

interface firecrawldata {
  description?: string;
  html?: string;
  links?: string[];
  markdown?: string;
  metadata?: firecrawlmetadata;
  title?: string;
  url: string;
}

export interface firecrawlresponse {
  data: firecrawldata[];
  success?: boolean;
}
