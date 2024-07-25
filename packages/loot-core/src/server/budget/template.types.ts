interface BaseTemplate {
  line: unknown;
}

interface TemplateWithPriority extends BaseTemplate {
  priority: number;
}

interface ScheduleTemplate extends TemplateWithPriority {
  type: 'schedule';
  name: string;
}

export interface ByTemplate extends TemplateWithPriority {
  type: 'by';
  month: string | Date;
  annual?: unknown;
  repeat?: number;
  from?: unknown;
  amount: number;
}

export interface SpendTemplate extends TemplateWithPriority {
  type: 'spend';
  month: unknown;
  annual?: unknown;
  repeat?: number;
  from?: unknown;
  amount: number;
}

export interface SimpleTemplate extends TemplateWithPriority {
  type: 'simple';
  limit: null | Limit;
  monthly: null | number;
}

interface Limit {
  amount: number;
  hold: boolean;
}

export interface WeekTemplate extends TemplateWithPriority {
  type: 'week';
  amount: number;
  weeks: null | number;
  limit: null | Limit;
  starting: string | Date;
}

export interface PercentageTemplate extends TemplateWithPriority {
  type: 'percentage';
  percent: number;
  category: string;
  previous: boolean;
}

export interface RemainderTemplate extends TemplateWithPriority {
  type: 'remainder';
  weight: number;
}

export interface AverageTemplate extends TemplateWithPriority {
  type: 'average';
  amount: number;
}

interface ErrorTemplate extends BaseTemplate {
  type: 'error';
  error: Error;
}

export type Template =
  | ScheduleTemplate
  | ByTemplate
  | SpendTemplate
  | SimpleTemplate
  | WeekTemplate
  | PercentageTemplate
  | RemainderTemplate
  | AverageTemplate
  | ErrorTemplate;
