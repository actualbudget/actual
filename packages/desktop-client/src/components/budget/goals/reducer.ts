import { type Template } from 'loot-core/server/budget/types/templates';

import { type Action } from './actions';
import { type DisplayTemplateType } from './constants';

type ReducerState = {
  template: Template;
  displayType: DisplayTemplateType | null;
};

const mapDisplayTypeToTemplateType = (
  currentTemplate: Template,
  visualType: DisplayTemplateType | null,
): Template => {
  switch (visualType) {
    case 'simple':
      if ('amount' in currentTemplate || currentTemplate.type === 'simple') {
        return currentTemplate;
      }
      return {
        directive: '',
        type: 'simple',
        monthly: 0,
      };
    case 'percentage':
      if (currentTemplate.type === 'percentage') {
        return currentTemplate;
      }
      return {
        directive: '',
        type: 'percentage',
        percent: 15,
        previous: false,
        category: '',
      };
    case 'schedule':
      if (currentTemplate.type === 'schedule') {
        return currentTemplate;
      }
      return {
        directive: '',
        type: 'schedule',
        name: '',
      };
    case 'week':
      if (currentTemplate.type === 'week') {
        return currentTemplate;
      }
      return {
        directive: '',
        type: 'week',
        amount: 0,
        weeks: null,
        starting: '',
      };
    case 'average':
      if (currentTemplate.type === 'average') {
        return currentTemplate;
      }
      return {
        directive: '',
        type: 'average',
        numMonths: 3,
      };
    case 'copy':
      if (currentTemplate.type === 'copy') {
        return currentTemplate;
      }
      return {
        directive: '',
        type: 'copy',
        lookBack: 1,
      };
    case 'remainder':
      if (currentTemplate.type === 'remainder') {
        return currentTemplate;
      }
      return {
        directive: '',
        type: 'remainder',
        weight: 1,
      };
    case 'goal':
      if (currentTemplate.type === 'goal') {
        return currentTemplate;
      }
      return {
        directive: '',
        type: 'goal',
        amount: 0,
      };
    default:
      // Make sure we're not missing any cases
      throw new Error(`Unknown display type: ${visualType satisfies null}`);
  }
};

export const templateReducer = (
  state: ReducerState,
  action: Action,
): ReducerState => {
  switch (action.type) {
    case 'set-type':
      return {
        ...state,
        displayType: action.payload,
        template: mapDisplayTypeToTemplateType(state.template, action.payload),
      };
    case 'set-limit': {
      if (state.displayType !== 'simple') {
        throw new Error(
          'Limits can only be applied to simple templates, this is a bug',
        );
      }

      if (
        state.template.type !== 'week' &&
        state.template.type !== 'simple' &&
        state.template.type !== 'remainder'
      ) {
        if (!action.payload) {
          return state;
        }

        return {
          ...state,
          template: {
            ...state.template,
            type: 'simple',
            limit: {
              amount: 0,
              hold: false,
              ...action.payload,
            },
          },
        };
      }
      return {
        ...state,
        template: {
          ...state.template,
          limit: action.payload
            ? {
                amount: 0,
                hold: false,
                ...state.template.limit,
                ...action.payload,
              }
            : undefined,
        },
      };
    }
    case 'update-template':
      const { type: _, ...payload } = action.payload;
      return {
        ...state,
        template: {
          ...state.template,
          ...payload,
        },
      };
    default:
      return state;
  }
};
