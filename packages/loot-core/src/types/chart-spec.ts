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
  x?: ChannelDef | ChannelDef[];
  y?: ChannelDef | ChannelDef[];
  series?: ChannelDef;
  color?: ChannelDef;
  size?: ChannelDef;
  text?: ChannelDef;
  tooltip?: ChannelDef[];
};

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'between'
  | 'is_null'
  | 'is_not_null';

export type ConditionalRuleCondition = {
  operator: ConditionOperator;
  value?: string | number;
  valueMax?: string | number;
};

export type ConditionalRuleStyling = {
  textColor?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
};

export type ConditionalSingleRule = {
  type: 'single_color';
  field: string;
  conditions: ConditionalRuleCondition[];
  styling: ConditionalRuleStyling;
  formatEntireRow?: boolean;
};

export type ConditionalColorScaleRule = {
  type: 'color_scale';
  field: string;
  minColor: string;
  maxColor: string;
  invert?: boolean;
};

export type ConditionalRule = ConditionalSingleRule | ConditionalColorScaleRule;

export type ValueAxisConfig = {
  labelOverride?: string;
};

export type CategoryAxisConfig = {
  labelOverride?: string;
};

export type AxesConfig = {
  valueAxis?: ValueAxisConfig;
  categoryAxis?: CategoryAxisConfig;
};

export type ChartConfig = {
  stack?: 'stack' | 'normalize' | 'none';
  fillGaps?: boolean;
  conditionalRules?: ConditionalRule[];
  axes?: AxesConfig;
};

export type ChartSpec = {
  mark: Mark;
  encoding: Encoding;
  config?: ChartConfig;
};
