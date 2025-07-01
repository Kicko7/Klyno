export interface batchtaskresult {
  added: number;
  errors?: error[];
  ids: string[];
  skips: string[];
  success: boolean;
}
