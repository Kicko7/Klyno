export interface kagisearchparameters {
  limit?: number;
  q: string;
}

interface kagithumbnail {
  height?: number | null;
  url: string;
  width?: number | null;
}

interface kagidata {
  published?: number;
  snippet?: string;
  t: number;
  thumbnail?: kagithumbnail;
  title: string;
  url: string;
}

export interface kagiresponse {
  data: kagidata[];
  meta?: any;
}
