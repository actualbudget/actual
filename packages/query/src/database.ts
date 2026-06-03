export type SqlParameter = string | number | boolean | null | Buffer;

export type DatabaseQueryResult = {
  changes: number;
  insertId?: number;
};

export type DatabaseRow = Record<string, SqlParameter>;

export type DatabaseSelectResult = DatabaseRow[];

export type DatabaseResult = DatabaseQueryResult | DatabaseSelectResult;

export type DatabaseOperation = {
  type: 'exec' | 'query';
  sql: string;
  params?: SqlParameter[];
  fetchAll?: boolean;
};

export type PluginMetadata = {
  key: string;
  value: string;
};
