export interface exportdatabasedata {
  data: record<string, object[]>;
  schemahash?: string;
  url?: string;
}

export interface importpgdatastructure {
  data: record<string, object[]>;
  mode: "pglite" | "postgres";
  schemahash: string;
}
