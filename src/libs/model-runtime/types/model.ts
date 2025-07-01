export interface modeldetail {
  details?: {
    families?: string[];
    family?: string;
    format?: string;
    parameter_size?: string;
    quantization_level?: string;
  };

  digest?: string;
  id: string;
  modified_at?: date;
  name?: string;
  size?: number;
}

export interface modelprogressresponse {
  completed?: number;
  digest?: string;
  model?: string;
  status: string;
  total?: number;
}

export interface modelsparams {
  name?: string;
}

export interface pullmodelparams {
  insecure?: boolean;
  model: string;
  stream?: boolean;
}

export interface modeldetailparams {
  model: string;
}

export interface deletemodelparams {
  model: string;
}

export interface modelrequestoptions {
  signal?: abortsignal;
}
