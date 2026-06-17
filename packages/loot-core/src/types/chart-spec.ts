export type Mark =
  | 'table'
  | 'number'
  | 'column'
  | 'bar'
  | 'line'
  | 'area'
  | 'point'
  | 'arc';

export type FieldType = 'number' | 'category' | 'date';

export type ChannelDef = {
  field: string;
  type?: FieldType;
  title?: string;
  format?: string;
  sort?: 'asc' | 'desc' | string[];
  aggregate?: 'sum' | 'count' | 'avg' | 'min' | 'max';
};

export type Encoding = {
  x?: ChannelDef;
  y?: ChannelDef | ChannelDef[];
  color?: ChannelDef;
  size?: ChannelDef;
  text?: ChannelDef;
  tooltip?: ChannelDef[];
};

export type ChartConfig = {
  stack?: 'stack' | 'normalize' | 'none';
};

export type ChartSpec = {
  mark: Mark;
  encoding: Encoding;
  config?: ChartConfig;
};
