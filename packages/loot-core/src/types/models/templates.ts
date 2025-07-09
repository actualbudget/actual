interface BaseTemplate {
  type: string;
  priority?: number;
  directive: string;
}

export interface PercentageTemplate extends BaseTemplate {
  type: 'percentage';
  percent: number;
  previous: boolean;
  category: string;
}

export interface PeriodicTemplate extends BaseTemplate {
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
    period?: 'daily' | 'weekly' | 'monthly';
    start?: string;
  };
}

export interface ByTemplate extends BaseTemplate {
  type: 'by';
  amount: number;
  month: string;
  annual?: boolean;
  repeat?: number;
  from?: string;
}

export interface SpendTemplate extends BaseTemplate {
  type: 'spend';
  amount: number;
  month: string;
  from: string;
  annual?: boolean;
  repeat?: number;
}

export interface SimpleTemplate extends BaseTemplate {
  type: 'simple';
  monthly?: number;
  limit?: {
    amount: number;
    hold: boolean;
    period?: 'daily' | 'weekly' | 'monthly';
    start?: string;
  };
}

export interface ScheduleTemplate extends BaseTemplate {
  type: 'schedule';
  name: string;
  full?: boolean;
  adjustment?: number;
}

export interface RemainderTemplate extends BaseTemplate {
  type: 'remainder';
  weight: number;
  limit?: {
    amount: number;
    hold: boolean;
    period?: 'daily' | 'weekly' | 'monthly';
    start?: string;
  };
}

export interface AverageTemplate extends BaseTemplate {
  type: 'average';
  numMonths: number;
}

export interface GoalTemplate extends BaseTemplate {
  type: 'goal';
  amount: number;
}

export interface CopyTemplate extends BaseTemplate {
  type: 'copy';
  lookBack: number;
}

interface ErrorTemplate extends BaseTemplate {
  type: 'error';
  line: string;
  error: string;
}

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
  | ErrorTemplate;
