export interface bravesearchparameters {
  count?: number;
  country?: string;
  enable_rich_callback?: boolean;
  extra_snippets?: boolean;
  freshness?: string;
  goggles?: string[];
  goggles_id?: string;
  offset?: number;
  q: string;
  result_filter?: string;
  safesearch?: string;
  search_lang?: string;
  spellcheck?: boolean;
  summary?: boolean;
  text_decorations?: boolean;
  ui_lang?: string;
  units?: string;
}

interface braveresults {
  age?: string;
  description: string;
  family_friendly?: boolean;
  is_live?: boolean;
  is_source_both?: boolean;
  is_source_local?: boolean;
  language?: string;
  meta_url?: any;
  page_age?: string;
  profile?: any;
  subtype?: string;
  thumbnail?: any;
  title: string;
  type: string;
  url: string;
  video?: any;
}

interface bravevideos {
  mutated_by_goggles?: boolean;
  results: braveresults[];
  type: string;
}

interface braveweb {
  family_friendly?: boolean;
  results: braveresults[];
  type: string;
}

export interface braveresponse {
  mixed: any;
  query?: any;
  type: string;
  videos?: bravevideos;
  web: braveweb;
}
