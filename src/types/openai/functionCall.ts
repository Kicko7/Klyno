export interface openaifunctioncall {
  arguments: string;
  name: string;
}

export interface openaitoolcall {
  function: openaifunctioncall;
  id: string;
  type: "function";
}
