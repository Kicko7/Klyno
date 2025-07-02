export interface GoogleSearchParameters {
  c2coff?: number;
  cx: string;
  daterestrict?: string;
  exactterms?: string;
  excludeterms?: string;
  filetype?: string;
  filter?: string;
  gl?: string;
  highrange?: string;
  hl?: string;
  hq?: string;
  imgcolortype?: string;
  imgdominantcolor?: string;
  imgsize?: string;
  imgtype?: string;
  key: string;
  linksite?: string;
  lowrange?: string;
  lr?: string;
  num?: number;
  orterms?: string;
  q: string;
  rights?: string;
  safe?: string;
  searchtype?: string;
  sitesearch?: string;
  sitesearchfilter?: string;
  sort?: string;
  start?: string;
}

export interface GoogleItems {
  displaylink?: string;
  formattedurl?: string;
  htmlformattedurl?: string;
  htmlsnippet?: string;
  htmltitle?: string;
  kind?: string;
  link: string;
  pagemap?: any;
  snippet: string;
  title: string;
}

export interface GoogleResponse {
  context?: any;
  items: GoogleItems[];
  kind?: string;
  queries?: any;
  searchinformation?: any;
  url?: any;
}
