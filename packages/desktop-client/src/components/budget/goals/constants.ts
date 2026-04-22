import type {
  AverageTemplate,
  ByTemplate,
  CopyTemplate,
  LimitTemplate,
  PercentageTemplate,
  PeriodicTemplate,
  RefillTemplate,
  RemainderTemplate,
  ScheduleTemplate,
} from '@actual-app/core/types/models/templates';

export const displayTemplateTypes = [
  ['week', 'Fixed amount'] as const,
  ['schedule', 'Cover schedule'] as const,
  ['by', 'Save by date'] as const,
  ['percentage', '% of income'] as const,
  ['historical', 'From history'] as const,
  ['limit', 'Balance cap'] as const,
  ['refill', 'Refill to cap'] as const,
  ['remainder', 'Whatever is left'] as const,
];

export type DisplayTemplateType = (typeof displayTemplateTypes)[number][0];

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
    }
  | {
      template: ByTemplate;
      displayType: 'by';
    }
  | {
      template: RemainderTemplate;
      displayType: 'remainder';
    };
