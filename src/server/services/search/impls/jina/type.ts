export interface jinasearchparameters {
  q: string;
}

interface jinausage {
  tokens: number;
}

interface jinameta {
  usage: jinausage;
}

interface jinadata {
  content?: string;
  description?: string;
  title: string;
  url: string;
  usage?: jinausage;
}

export interface jinaresponse {
  code?: number;
  data: jinadata[];
  meta?: jinameta;
  status?: number;
}
