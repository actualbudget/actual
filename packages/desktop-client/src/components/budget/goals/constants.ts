import {
  type AverageTemplate,
  type CopyTemplate,
  type PercentageTemplate,
  type ScheduleTemplate,
  type SimpleTemplate,
  type PeriodicTemplate,
} from 'loot-core/types/models/templates';

export const displayTemplateTypes = [
  ['simple', 'Fixed (monthly)'] as const,
  ['week', 'Fixed (weekly)'] as const,
  ['schedule', 'Schedule'] as const,
  ['percentage', 'Percent of category'] as const,
  ['historical', 'Copy past budgets'] as const,
];

export type DisplayTemplateType = (typeof displayTemplateTypes)[number][0];

export type ReducerState =
  | {
      template: SimpleTemplate;
      displayType: 'simple';
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
