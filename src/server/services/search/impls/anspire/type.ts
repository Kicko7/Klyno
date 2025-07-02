export interface anspiresearchparameters {
  fromtime?: string;
  insite?: string;
  mode?: number;
  query: string;
  top_k?: number;
  totime?: string;
}

interface anspireresults {
  content?: string;
  score?: number;
  title: string;
  url: string;
}

export interface anspireresponse {
  query?: string;
  results?: anspireresults[];
  uuid?: string;
}
