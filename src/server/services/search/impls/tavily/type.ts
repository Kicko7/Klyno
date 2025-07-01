export interface tavilysearchparameters {
  chunks_per_source?: number;
  days?: number;
  exclude_domains?: string[];
  include_answer?: boolean | string;
  include_domains?: string[];
  include_image_descriptions?: boolean;
  include_images?: boolean;
  include_raw_content?: boolean;
  max_results?: number;
  query: string;
  search_depth?: string;
  time_range?: string;
  topic?: string;
}

interface tavilyimages {
  description?: string;
  url: string;
}

interface tavilyresults {
  content?: string;
  raw_content?: string | null;
  score?: number;
  title?: string;
  url: string;
}

export interface tavilyresponse {
  answer?: string;
  images?: tavilyimages[];
  query: string;
  response_time: number;
  results: tavilyresults[];
}
