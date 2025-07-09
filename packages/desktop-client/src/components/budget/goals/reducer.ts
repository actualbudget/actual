import { type Template } from 'loot-core/types/models/templates';

import { type Action } from './actions';
import { type ReducerState, type DisplayTemplateType } from './constants';

export const getInitialState = (template: Template | null): ReducerState => {
  const type = template?.type;
  switch (type) {
    case 'simple':
      return {
        template,
        displayType: 'simple',
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
        displayType: 'week',
      };
    case 'spend':
    case 'by':
      throw new Error('Goal is not yet supported');
    case 'remainder':
      throw new Error('Remainder is not yet supported');
    case 'average':
    case 'copy':
      return {
        template,
        displayType: 'historical',
      };
    case 'goal':
      throw new Error('Goal is not yet supported');
    case 'error':
      throw new Error('An error occurred while parsing the template');
    default:
      throw new Error(`Unknown template type: ${type satisfies undefined}`);
  }
};

const changeType = (
  prevState: ReducerState,
  visualType: DisplayTemplateType,
): ReducerState => {
  switch (visualType) {
    case 'simple':
      if (prevState.template.type === 'simple') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: '',
          type: 'simple',
          monthly: 500,
        },
      };
    case 'percentage':
      if (prevState.template.type === 'percentage') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: '',
          type: 'percentage',
          percent: 15,
          previous: false,
          category: 'total',
        },
      };
    case 'schedule':
      if (prevState.template.type === 'schedule') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: '',
          type: 'schedule',
          name: '',
        },
      };
    case 'week':
      if (prevState.template.type === 'periodic') {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: '',
          type: 'periodic',
          amount: 500,
          period: {
            period: 'week',
            amount: 1,
          },
          starting: '',
        },
      };
    case 'historical':
      if (
        prevState.template.type === 'copy' ||
        prevState.template.type === 'average'
      ) {
        return prevState;
      }
      return {
        displayType: visualType,
        template: {
          directive: '',
          type: 'average',
          numMonths: 3,
        },
      };
    default:
      // Make sure we're not missing any cases
      throw new Error(`Unknown display type: ${visualType satisfies never}`);
  }
};

function mapTemplateTypesForUpdate(
  state: ReducerState,
  template: Partial<Template>,
): ReducerState {
  switch (state.template.type) {
    case 'average':
      switch (template.type) {
        case 'copy':
          return {
            ...state,
            displayType: 'historical',
            template: {
              ...template,
              directive: '',
              type: 'copy',
              lookBack: state.template.numMonths,
            },
          };
        default:
          break;
      }
      break;
    case 'copy':
      switch (template.type) {
        case 'average':
          return {
            ...state,
            displayType: 'historical',
            template: {
              ...template,
              directive: '',
              type: 'average',
              numMonths: state.template.lookBack,
            },
          };
        default:
          break;
      }
      break;
    default:
      break;
  }

  if (!template.type || state.template.type === template.type) {
    const { type: _, ...rest } = template;
    return {
      ...state,
      ...getInitialState({
        ...state.template,
        ...rest,
      }),
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
  switch (action.type) {
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
      return state;
  }
};
