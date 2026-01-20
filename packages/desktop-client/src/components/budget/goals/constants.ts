import {
  type AverageTemplate,
  type CopyTemplate,
  type LimitTemplate,
  type PercentageTemplate,
  type PeriodicTemplate,
  type ScheduleTemplate,
} from 'loot-core/types/models/templates';

export const displayTemplateTypes = [
  ['limit', 'Balance limit'] as const,
  ['refill', 'Refill'] as const,
  ['week', 'Fixed (weekly)'] as const,
  ['schedule', 'Existing schedule'] as const,
  ['percentage', 'Percent of category'] as const,
  ['historical', 'Copy past budgets'] as const,
];

export type DisplayTemplateType = (typeof displayTemplateTypes)[number][0];

export type ReducerState =
  | {
      template: LimitTemplate;
      displayType: 'limit';
    }
  | {
      template: LimitTemplate;
      displayType: 'refill';
    }
  | {
      template: PeriodicTemplate;
      displayType: 'week';
    }
  | {
      template: ScheduleTemplate;
      displayType: 'schedule';
    }
  | {
      template: PercentageTemplate;
      displayType: 'percentage';
    }
  | {
      template: CopyTemplate | AverageTemplate;
      displayType: 'historical';
    };
