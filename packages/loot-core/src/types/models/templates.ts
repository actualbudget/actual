type BaseTemplate = {
  type: string;
  directive: 'template' | 'goal' | 'error';
};
type BaseTemplateWithPriority = {
  priority: number;
  directive: 'template';
} & BaseTemplate;

export type PercentageTemplate = {
  type: 'percentage';
  percent: number;
  previous: boolean;
  category: string;
} & BaseTemplateWithPriority;

export type PeriodicTemplate = {
  type: 'periodic';
  amount: number;
  period: {
    period: 'day' | 'week' | 'month' | 'year';
    amount: number;
  };
  starting: string;
  limit?: {
    amount: number;
    hold: boolean;
    period: 'daily' | 'weekly' | 'monthly';
    start?: string;
  };
} & BaseTemplateWithPriority;

export type ByTemplate = {
  type: 'by';
  amount: number;
  month: string;
  annual?: boolean;
  repeat?: number;
  from?: string;
} & BaseTemplateWithPriority;

export type SpendTemplate = {
  type: 'spend';
  amount: number;
  month: string;
  from: string;
  annual?: boolean;
  repeat?: number;
} & BaseTemplateWithPriority;

export type SimpleTemplate = {
  type: 'simple';
  monthly?: number;
  limit?: {
    amount: number;
    hold: boolean;
    period: 'daily' | 'weekly' | 'monthly';
    start?: string;
  };
} & BaseTemplateWithPriority;

export type ScheduleTemplate = {
  type: 'schedule';
  name: string;
  full?: boolean;
  adjustment?: number;
  adjustmentType?: 'percent' | 'fixed';
} & BaseTemplateWithPriority;

export type AverageTemplate = {
  type: 'average';
  numMonths: number;
  adjustment?: number;
  adjustmentType?: 'percent' | 'fixed';
} & BaseTemplateWithPriority;

export type CopyTemplate = {
  type: 'copy';
  lookBack: number;
} & BaseTemplateWithPriority;

export type RemainderTemplate = {
  type: 'remainder';
  weight: number;
  limit?: {
    amount: number;
    hold: boolean;
    period: 'daily' | 'weekly' | 'monthly';
    start?: string;
  };
  directive: 'template';
  priority: null;
} & BaseTemplate;

export type RefillTemplate = {
  type: 'refill';
} & BaseTemplateWithPriority;

export type GoalTemplate = {
  type: 'goal';
  amount: number;
  directive: 'goal';
} & BaseTemplate;

export type LimitTemplate = {
  type: 'limit';
  amount: number;
  hold: boolean;
  period: 'daily' | 'weekly' | 'monthly';
  start?: string;
  directive: 'template';
  priority: null;
} & BaseTemplate;

type ErrorTemplate = {
  type: 'error';
  line: string;
  error: string;
  directive: 'error';
} & BaseTemplate;

export type Template =
  | PercentageTemplate
  | PeriodicTemplate
  | ByTemplate
  | SpendTemplate
  | SimpleTemplate
  | ScheduleTemplate
  | RemainderTemplate
  | AverageTemplate
  | GoalTemplate
  | CopyTemplate
  | RefillTemplate
  | LimitTemplate
  | ErrorTemplate;
