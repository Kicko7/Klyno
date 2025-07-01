export interface tablebasicinfo {
  count: number;
  name: string;
  type: "BASE TABLE" | "VIEW";
}

export interface tablecolumninfo {
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

export interface paginationparams {
  page: number;
  pagesize: number;
  sortby?: string;
  sortorder?: "asc" | "desc";
}

export interface filtercondition {
  column: string;
  operator: "equals" | "contains" | "startsWith" | "endsWith";
  value: any;
}
