import {
  type AverageTemplate,
  type CopyTemplate,
  type PercentageTemplate,
  type ScheduleTemplate,
  type SimpleTemplate,
  type WeekTemplate,
} from 'loot-core/server/budget/types/templates';

export const displayTemplateTypes = [
  ['simple', 'Fixed (monthly)'] as const,
  ['week', 'Fixed (weekly)'] as const,
  ['schedule', 'Schedule'] as const,
  ['percentage', 'Percent of category'] as const,
  ['historical', 'Copy past budgets'] as const,
  // TODO(jfdoming): implement
  // ['goal', 'Set a goal'] as const,
];

export type DisplayTemplateType = (typeof displayTemplateTypes)[number][0];

export type ReducerState =
  | {
      template: SimpleTemplate;
      displayType: 'simple';
    }
  | {
      template: WeekTemplate;
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
// TODO(jfdoming): implement
// | {
//     template: ByTemplate | SpendTemplate;
//     displayType: 'goal';
//   };
