export interface anspiresearchparameters {
  fromtime?: string;
  insite?: string;
  totime?: string;
  mode?: number;
  query: string;
  top_k?: number;
}

interface anspireresults {
  content?: string;
  score?: number;
  title: string;
  url: string;
}

export interface anspireresponse {
  uuid?: string;
  query?: string;
  results?: anspireresults[];
}
