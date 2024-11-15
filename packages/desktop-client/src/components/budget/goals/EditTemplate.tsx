import { useReducer } from 'react';

import { type Template } from 'loot-core/server/budget/types/templates';

import { Select } from '../../common/Select';
import { Stack } from '../../common/Stack';
import { GenericInput } from '../../util/GenericInput';

import { setType, type Action } from './actions';
import { type VisualTemplateType, visualTemplateTypes } from './constants';

type EditTemplateProps = {
  template: Template;
};

const getAmount = (template: Template) => {
  switch (template.type) {
    case 'week':
    case 'by':
    case 'spend':
    case 'average':
    case 'goal':
      return template.amount;
    default:
      return 0;
  }
};

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

const templateReducer = (state: ReducerState, action: Action): ReducerState => {
  switch (action.type) {
    case 'set-type':
      return {
        ...state,
        visualType: action.payload,
        template: mapVisualTypeToTemplateType(state.template, action.payload),
      };
    default:
      return state;
  }
};

export const EditTemplate = ({ template }: EditTemplateProps) => {
  const [state, dispatch] = useReducer(templateReducer, {
    template,
    visualType: 'amount',
  });

  return (
    <Stack direction="row" align="center" justify="center" spacing={2}>
      Each month, budget
      <Select
        options={visualTemplateTypes}
        value={state.visualType}
        onChange={type => dispatch(setType(type))}
      />
      {state.visualType === 'amount' && (
        <GenericInput
          type="number"
          numberFormatType="currency"
          value={getAmount(state.template)}
          onChange={null}
          style={{ maxWidth: 200 }}
        />
      )}
      {state.template.type === 'percentage' && (
        <GenericInput
          type="number"
          numberFormatType="percentage"
          value={state.template.percent}
          onChange={null}
        />
      )}
      {state.template.type === 'schedule' && (
        <Select options={[['s-1', 'Schedule 1']]} value="s-1" />
      )}
    </Stack>
  );
};
