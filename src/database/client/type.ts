export interface InitMeta {
  dbname: string;
  fsbundle: Blob;
  vectorbundlepath: string;
  wasmmodule: WebAssembly.Module;
}
