export interface TableBasicInfo {
  count: number;
  name: string;
  type: 'BASE TABLE' | 'VIEW';
}

export interface TableColumnInfo {
  defaultvalue?: string;
  foreignKey?: {
    column: string;
    table: string;
  };

  isprimarykey: boolean;
  name: string;
  nullable: boolean;
  type: string;
}

export interface PaginationParams {
  page: number;
  pagesize: number;
  sortby?: string;
  sortorder?: 'asc' | 'desc';
}

export interface FilterCondition {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}
