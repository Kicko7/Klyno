export interface exasearchparameters {
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

interface exacostdollars {
  total: number;
}

interface exaresults {
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

export interface exaresponse {
  costdollars?: exacostdollars;
  requestid?: string;
  resolvedsearchtype?: string;
  results: exaresults[];
  searchtype?: string;
}
