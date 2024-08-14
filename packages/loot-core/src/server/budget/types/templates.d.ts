interface BaseTemplate {
  type: string;
  priority?: number;
  directive: string;
}

interface PercentageTemplate extends BaseTemplate {
  type: 'percentage';
  percent: number;
  previous: boolean;
  category: string;
}

interface WeekTemplate extends BaseTemplate {
  type: 'week';
  amount: number;
  weeks: number | null;
  starting: string;
  limit?: { amount: number; hold: boolean };
}

interface ByTemplate extends BaseTemplate {
  type: 'by';
  amount: number;
  month: string;
  repeat?: { annual: boolean; repeat?: number };
  from?: string;
}

interface SpendTemplate extends BaseTemplate {
  type: 'spend';
  amount: number;
  month: string;
  from: string;
  repeat?: { annual: boolean; repeat?: number };
}

interface SimpleTemplate extends BaseTemplate {
  type: 'simple';
  monthly?: number;
  limit?: { amount: number; hold: boolean };
}

interface ScheduleTemplate extends BaseTemplate {
  type: 'schedule';
  name: string;
  full?: boolean;
}

interface RemainderTemplate extends BaseTemplate {
  type: 'remainder';
  weight: number;
  limit?: { amount: number; hold: boolean };
}

interface AverageTemplate extends BaseTemplate {
  type: 'average';
  amount: number;
}

interface GoalTemplate extends BaseTemplate {
  type: 'simple';
  amount: number;
}

interface ErrorTemplate extends BaseTemplate {
  type: 'error';
  line: string;
  error: string;
}

export type Template =
  | PercentageTemplate
  | WeekTemplate
  | ByTemplate
  | SpendTemplate
  | SimpleTemplate
  | ScheduleTemplate
  | RemainderTemplate
  | AverageTemplate
  | GoalTemplate
  | ErrorTemplate;
