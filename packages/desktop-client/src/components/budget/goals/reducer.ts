import { type Template } from 'loot-core/server/budget/types/templates';

import { type Action } from './actions';
import { type VisualTemplateType } from './constants';

type ReducerState = {
  template: Template;
  visualType: VisualTemplateType;
};

const mapVisualTypeToTemplateType = (
  currentTemplate: Template,
  visualType: VisualTemplateType,
): Template => {
  switch (visualType) {
    case 'amount':
      if ('amount' in currentTemplate || currentTemplate.type === 'simple') {
        return currentTemplate;
      }
      return {
        directive: '',
        type: 'simple',
        monthly: 0,
      };
    case 'percent':
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
        visualType: action.payload,
        template: mapVisualTypeToTemplateType(state.template, action.payload),
      };
    case 'set-limit': {
      if (state.visualType !== 'amount') {
        throw new Error(
          'Limits can only be applied to amount templates, this is a bug',
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
