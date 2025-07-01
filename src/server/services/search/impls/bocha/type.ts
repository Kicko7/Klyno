export interface bochasearchparameters {
  count?: number;
  exclude?: string;
  freshness?: string;
  include?: string;
  query: string;
  summary?: boolean;
}

interface bochaquerycontext {
  originalquery: string;
}

interface bochavalue {
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

interface bochawebpages {
  totalestimatedmatches?: number;
  value?: bochavalue[];
  websearchurl?: string;
}

interface bochadata {
  images?: any;
  querycontext?: bochaquerycontext;
  videos?: any;
  webpages: bochawebpages;
}

export interface bocharesponse {
  code?: number;
  data: bochadata;
  log_id?: string;
  msg?: string | null;
}
