import type {
  AverageTemplate,
  ByTemplate,
  CopyTemplate,
  GoalTemplate,
  LimitTemplate,
  PercentageTemplate,
  PeriodicTemplate,
  RefillTemplate,
  RemainderTemplate,
  ScheduleTemplate,
} from '@actual-app/core/types/models/templates';

export const displayTemplateTypes = [
  'fixed',
  'schedule',
  'by',
  'percentage',
  'historical',
  'limit',
  'refill',
  'remainder',
  'goal',
] as const;

export type DisplayTemplateType = (typeof displayTemplateTypes)[number];

export type ReducerState =
  | {
      template: LimitTemplate;
      displayType: 'limit';
    }
  | {
      template: RefillTemplate;
      displayType: 'refill';
    }
  | {
      template: PeriodicTemplate;
      displayType: 'fixed';
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
    }
  | {
      template: ByTemplate;
      displayType: 'by';
    }
  | {
      template: RemainderTemplate;
      displayType: 'remainder';
    }
  | {
      template: GoalTemplate;
      displayType: 'goal';
    };
