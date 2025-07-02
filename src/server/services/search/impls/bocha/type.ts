export interface BochaSearchParameters {
  count?: number;
  exclude?: string;
  freshness?: string;
  include?: string;
  query: string;
  summary?: boolean;
}

export interface BochaQueryContext {
  originalquery: string;
}

export interface BochaValue {
  cachedpageurl?: string;
  datelastcrawled?: string;
  displayurl?: string;
  id?: string | null;
  isfamilyfriendly?: boolean;
  isnavigational?: boolean;
  language?: string;
  name: string;
  sitename?: string;
  snippet?: string;
  summary?: string;
  url: string;
}

export interface BochaWebPages {
  totalestimatedmatches?: number;
  value?: BochaValue[];
  websearchurl?: string;
}

export interface BochaData {
  images?: any;
  querycontext?: BochaQueryContext;
  videos?: any;
  webpages: BochaWebPages;
}

export interface BochaResponse {
  code?: number;
  data: BochaData;
  log_id?: string;
  msg?: string | null;
}
