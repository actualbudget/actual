import { useMemo, useReducer } from 'react';
import { Trans } from 'react-i18next';

import { type Template } from 'loot-core/server/budget/types/templates';

import { useCategories } from '../../../hooks/useCategories';
import { SvgAdd } from '../../../icons/v1';
import { styles } from '../../../style';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button2';
import { Select } from '../../common/Select';
import { Stack } from '../../common/Stack';
import { View } from '../../common/View';
import { GenericInput } from '../../util/GenericInput';

import { setLimit, setType, updateTemplate } from './actions';
import { visualTemplateTypes } from './constants';
import { templateReducer } from './reducer';

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
    case 'simple':
      return template.monthly;
    default:
      return 0;
  }
};

export const EditTemplate = ({ template }: EditTemplateProps) => {
  const { grouped } = useCategories();
  const categories = useMemo(() => {
    const incomeGroup = grouped.filter(group => group.name === 'Income')[0];
    return [
      {
        id: '',
        name: '',
        categories: [
          { id: '', cat_group: '', name: 'the total of all income' },
        ],
      },
      { ...incomeGroup, name: 'Income categories' },
    ];
  }, [grouped]);

  const [state, dispatch] = useReducer(templateReducer, {
    template,
    visualType: 'amount',
  });

  const visualTypePicker = (
    <Select
      key="visual-type-picker"
      options={visualTemplateTypes}
      value={state.visualType}
      onChange={type => dispatch(setType(type))}
    />
  );

  return (
    <Stack
      direction="row"
      align="center"
      justify="center"
      spacing={2}
      style={{ ...styles.editorPill, paddingLeft: 8 }}
    >
      <Trans />
      Each month, budget
      {visualTypePicker}
      {state.visualType === 'amount' && (
        <>
          of
          <Select
            key="amount-limit"
            options={[
              ['false', 'exactly'],
              ['true', 'at most'],
            ]}
            value={!!state.template['limit'] ? 'true' : 'false'}
            onChange={value =>
              dispatch(
                setLimit(
                  value === 'false' ? undefined : { amount: 0, hold: false },
                ),
              )
            }
          />
          <GenericInput
            key="amount-input"
            type="number"
            numberFormatType="currency"
            value={getAmount(state.template)}
            onChange={null}
            style={{ maxWidth: 200 }}
          />
        </>
      )}
      {state.template.type === 'percentage' && (
        <>
          <GenericInput
            key="percent-input"
            type="number"
            numberFormatType="percentage"
            value={state.template.percent}
            onChange={(value: number) =>
              dispatch(updateTemplate({ type: 'percentage', percent: value }))
            }
            style={{ maxWidth: 200 }}
          />
          of
          <CategoryAutocomplete
            onSelect={value => null}
            value=""
            categoryGroups={categories}
          />
        </>
      )}
      {state.template.type === 'schedule' && (
        <>
          <Select
            key="schedule-picker"
            options={[['s-1', 'Schedule 1']]}
            value="s-1"
          />
          <div>and</div>
          <Select
            key="schedule-full"
            options={[
              ['false', 'save up'],
              ['true', 'don’t save up'],
            ]}
            value={String(!!state.template.full)}
            onChange={full =>
              dispatch(
                updateTemplate({ type: 'schedule', full: full === 'true' }),
              )
            }
          />
          for future months
        </>
      )}
      <View style={{ flexGrow: '1' }} />
      <Button
        variant="bare"
        // onPress={onAdd}
        style={{ padding: 7 }}
        aria-label="Add entry"
      >
        <SvgAdd style={{ width: 10, height: 10, color: 'inherit' }} />
      </Button>
    </Stack>
  );
};
