interface BaseTemplate {
  type: string;
  directive: 'template' | 'goal' | 'error';
}
interface BaseTemplateWithPriority extends BaseTemplate {
  priority: number;
  directive: 'template';
}

export interface PercentageTemplate extends BaseTemplateWithPriority {
  type: 'percentage';
  percent: number;
  previous: boolean;
  category: string;
}

export interface PeriodicTemplate extends BaseTemplateWithPriority {
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

export interface ByTemplate extends BaseTemplateWithPriority {
  type: 'by';
  amount: number;
  month: string;
  annual?: boolean;
  repeat?: number;
  from?: string;
}

export interface SpendTemplate extends BaseTemplateWithPriority {
  type: 'spend';
  amount: number;
  month: string;
  from: string;
  annual?: boolean;
  repeat?: number;
}

export interface SimpleTemplate extends BaseTemplateWithPriority {
  type: 'simple';
  monthly?: number;
  limit?: {
    amount: number;
    hold: boolean;
    period?: 'daily' | 'weekly' | 'monthly';
    start?: string;
  };
}

export interface ScheduleTemplate extends BaseTemplateWithPriority {
  type: 'schedule';
  name: string;
  full?: boolean;
  adjustment?: number;
}

export interface AverageTemplate extends BaseTemplateWithPriority {
  type: 'average';
  numMonths: number;
}

export interface CopyTemplate extends BaseTemplateWithPriority {
  type: 'copy';
  lookBack: number;
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
  directive: 'template';
  priority: null;
}

export interface GoalTemplate extends BaseTemplate {
  type: 'goal';
  amount: number;
  directive: 'goal';
}

interface ErrorTemplate extends BaseTemplate {
  type: 'error';
  line: string;
  error: string;
  directive: 'error';
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
