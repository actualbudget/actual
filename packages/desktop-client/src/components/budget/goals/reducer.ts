import {
  addMonths,
  dayFromDate,
  firstDayOfMonth,
  monthFromDate,
} from '@actual-app/core/shared/months';
import type {
  AverageTemplate,
  CopyTemplate,
  Template,
  Weekday,
  WeeklyAverageTemplate,
} from '@actual-app/core/types/models/templates';

import type { Action } from './actions';
import type { DisplayTemplateType, ReducerState } from './constants';

export const DEFAULT_PRIORITY = 1;
const DEFAULT_WEEKLY_AVERAGE_WEEKS = 12;
const DEFAULT_WEEKLY_AVERAGE_WEEKDAY: Weekday = 'monday';

export const getInitialState = (template: Template | null): ReducerState => {
  if (!template) {
    throw new Error('Template cannot be null');
  }
  const type = template.type;
  switch (type) {
    case 'simple':
      return {
        template: {
          type: 'periodic',
          amount: template.monthly ?? 0,
          period: {
            period: 'month',
            amount: 1,
          },
          starting: firstDayOfMonth(new Date()),
          priority: template.priority,
          directive: template.directive,
        },
        displayType: 'fixed',
      };
    case 'percentage':
      return {
        template,
        displayType: 'percentage',
      };
    case 'schedule':
      return {
        template,
        displayType: 'schedule',
      };
    case 'periodic':
      return {
        template,
        displayType: 'fixed',
      };
    case 'by':
    case 'spend':
      return {
        template:
          template.annual !== undefined && template.repeat == null
            ? { ...template, repeat: 1 }
            : template,
        displayType: 'by',
      };
    case 'remainder':
      return {
        template,
        displayType: 'remainder',
      };
    case 'limit':
      return {
        template,
        displayType: 'limit',
      };
    case 'refill':
      return {
        template,
        displayType: 'refill',
      };
    case 'average':
    case 'weeklyAverage':
    case 'copy':
      return {
        template,
        displayType: 'historical',
      };
    case 'goal':
      return {
        template,
        displayType: 'goal',
      };
    case 'error':
      throw new Error('An error occurred while parsing the template');
    default:
      throw new Error(
        `Unknown template type: ${String(type satisfies undefined)}`,
      );
  }
};

const changeType = (
  prevState: ReducerState,
  visualType: DisplayTemplateType,
): ReducerState => {
  switch (visualType) {
    case 'limit':
      if (prevState.template.type === 'limit') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: 'template',
          type: 'limit',
          amount: 500,
          period: 'monthly',
          hold: false,
          priority: null,
        },
      };
    case 'refill':
      if (prevState.template.type === 'refill') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: 'template',
          type: 'refill',
          priority: DEFAULT_PRIORITY,
        },
      };
    case 'percentage':
      if (prevState.template.type === 'percentage') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: 'template',
          type: 'percentage',
          percent: 15,
          previous: false,
          category: 'all income',
          priority: DEFAULT_PRIORITY,
        },
      };
    case 'schedule':
      if (prevState.template.type === 'schedule') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: 'template',
          type: 'schedule',
          name: '',
          priority: DEFAULT_PRIORITY,
        },
      };
    case 'fixed':
      if (prevState.template.type === 'periodic') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: 'template',
          type: 'periodic',
          amount: 100,
          period: {
            period: 'month',
            amount: 1,
          },
          starting: dayFromDate(firstDayOfMonth(new Date())),
          priority: DEFAULT_PRIORITY,
        },
      };
    case 'historical':
      if (
        prevState.template.type === 'copy' ||
        prevState.template.type === 'average' ||
        prevState.template.type === 'weeklyAverage'
      ) {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: 'template',
          type: 'average',
          numMonths: 3,
          priority: DEFAULT_PRIORITY,
        },
      };
    case 'by':
      // 'spend' shares displayType 'by'; preserve it instead of discarding
      if (
        prevState.template.type === 'by' ||
        prevState.template.type === 'spend'
      ) {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: 'template',
          type: 'by',
          amount: 1200,
          month: addMonths(monthFromDate(new Date()), 12),
          annual: true,
          repeat: 1,
          priority: DEFAULT_PRIORITY,
        },
      };
    case 'remainder':
      if (prevState.template.type === 'remainder') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: 'template',
          type: 'remainder',
          weight: 1,
          priority: null,
        },
      };
    case 'goal':
      if (prevState.template.type === 'goal') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: 'goal',
          type: 'goal',
          amount: 1000,
        },
      };
    default:
      // Make sure we're not missing any cases
      throw new Error(
        `Unknown display type: ${String(visualType satisfies never)}`,
      );
  }
};

type HistoricalTemplate =
  | CopyTemplate
  | AverageTemplate
  | WeeklyAverageTemplate;
type TemplateUpdate = Partial<Template> & Pick<Template, 'type'>;
type HistoricalUpdate = Partial<Template> & Pick<HistoricalTemplate, 'type'>;

function isHistoricalUpdate(
  template: TemplateUpdate,
): template is HistoricalUpdate {
  return (
    template.type === 'copy' ||
    template.type === 'average' ||
    template.type === 'weeklyAverage'
  );
}

// Switches between the historical modes, keeping whatever carries over: the
// month count between copy and average, a percentage adjustment between the
// two averages, and the priority always. Fixed adjustments are dropped: the
// monthly average adds them once per month but the weekly average once per
// week, so carrying one over would silently change the budgeted amount.
function convertHistoricalTemplate(
  prev: HistoricalTemplate,
  template: HistoricalUpdate,
): HistoricalTemplate {
  const months =
    prev.type === 'average'
      ? prev.numMonths
      : prev.type === 'copy'
        ? prev.lookBack
        : undefined;
  const adjustment =
    prev.type !== 'copy' && prev.adjustmentType === 'percent'
      ? { adjustment: prev.adjustment, adjustmentType: prev.adjustmentType }
      : {};

  switch (template.type) {
    case 'copy':
      return {
        ...template,
        directive: 'template',
        type: 'copy',
        lookBack: months ?? 1,
        priority: prev.priority,
      };
    case 'average':
      return {
        ...template,
        directive: 'template',
        type: 'average',
        numMonths: months ?? 3,
        ...adjustment,
        priority: prev.priority,
      };
    case 'weeklyAverage':
      return {
        ...template,
        directive: 'template',
        type: 'weeklyAverage',
        numWeeks: DEFAULT_WEEKLY_AVERAGE_WEEKS,
        weekday: DEFAULT_WEEKLY_AVERAGE_WEEKDAY,
        ...adjustment,
        priority: prev.priority,
      };
    default:
      throw new Error(
        `Unknown historical template: ${String(template satisfies never)}`,
      );
  }
}

function mapTemplateTypesForUpdate(
  state: ReducerState,
  template: TemplateUpdate,
): ReducerState {
  switch (state.template.type) {
    case 'average':
    case 'copy':
    case 'weeklyAverage':
      if (
        isHistoricalUpdate(template) &&
        template.type !== state.template.type
      ) {
        return {
          ...state,
          displayType: 'historical',
          template: convertHistoricalTemplate(state.template, template),
        };
      }
      break;
    case 'by':
      switch (template.type) {
        case 'spend': {
          // toggling spend-down on: carry the by template's fields into a
          // spend template; default `from` to the target month if not given
          const from =
            'from' in template && typeof template.from === 'string'
              ? template.from
              : state.template.month;
          return {
            ...state,
            displayType: 'by',
            template: {
              ...state.template,
              ...template,
              type: 'spend',
              from,
            },
          };
        }
        default:
          break;
      }
      break;
    case 'spend':
      switch (template.type) {
        case 'by': {
          // toggling spend-down off: drop `from`, keep everything else
          const { from: _from, ...rest } = state.template;
          void _from;
          return {
            ...state,
            displayType: 'by',
            template: {
              ...rest,
              ...template,
              type: 'by',
            },
          };
        }
        default:
          break;
      }
      break;
    default:
      break;
  }

  if (state.template.type === template.type) {
    const mergedTemplate = Object.assign({}, state.template, template);
    return {
      ...state,
      ...getInitialState(mergedTemplate),
    };
  }

  console.error(
    `Template type mismatch: ${state.template.type} !== ${template.type}`,
  );
  return state;
}

export const templateReducer = (
  state: ReducerState,
  action: Action,
): ReducerState => {
  const type = action.type;
  switch (type) {
    case 'set-type':
      return {
        ...state,
        ...changeType(state, action.payload),
      };
    case 'set-template':
      return {
        ...state,
        ...getInitialState(action.payload),
      };
    case 'update-template':
      return mapTemplateTypesForUpdate(state, action.payload);
    default:
      // Make sure we're not missing any cases
      throw new Error(`Unknown display type: ${String(type satisfies never)}`);
  }
};
