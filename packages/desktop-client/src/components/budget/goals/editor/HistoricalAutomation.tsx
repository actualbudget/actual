import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import type {
  AverageTemplate,
  CopyTemplate,
  WeeklyAverageTemplate,
} from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { AmountAdjustment } from '#components/budget/goals/editor/AmountAdjustment';
import {
  DESKTOP_FIELD_GAP,
  MOBILE_FIELD_GAP,
  STACKED_FIELD_FLEX,
} from '#components/budget/goals/editor/fieldLayout';
import { FormField, FormLabel } from '#components/forms';

type HistoricalAutomationProps = {
  template: CopyTemplate | AverageTemplate | WeeklyAverageTemplate;
  dispatch: (action: Action) => void;
};

export const HistoricalAutomation = ({
  template,
  dispatch,
}: HistoricalAutomationProps) => {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const fieldFlex = isNarrowWidth ? STACKED_FIELD_FLEX : 1;

  const periods = getPeriodCount(template);
  const [rawPeriods, setRawPeriods] = useState(String(periods));
  const [prevPeriods, setPrevPeriods] = useState(periods);
  if (periods !== prevPeriods) {
    setPrevPeriods(periods);
    setRawPeriods(String(periods));
  }

  const commitPeriods = () => {
    const parsed = Math.max(1, Math.trunc(Number(rawPeriods)) || 1);
    setRawPeriods(String(parsed));
    if (parsed === periods) return;
    switch (template.type) {
      case 'average':
        dispatch(updateTemplate({ type: 'average', numMonths: parsed }));
        break;
      case 'weeklyAverage':
        dispatch(updateTemplate({ type: 'weeklyAverage', numWeeks: parsed }));
        break;
      case 'copy':
        dispatch(updateTemplate({ type: 'copy', lookBack: parsed }));
        break;
      default:
        throw new Error(
          `Unknown historical template: ${String(template satisfies never)}`,
        );
    }
  };

  return (
    <>
      <SpaceBetween
        gap={isNarrowWidth ? MOBILE_FIELD_GAP : DESKTOP_FIELD_GAP}
        style={{ marginTop: 10 }}
      >
        <FormField style={{ flex: fieldFlex }}>
          <FormLabel title={t('Mode')} htmlFor="mode-field" />
          <Select
            id="mode-field"
            key="mode-picker"
            options={[
              ['copy', t('Copy a previous month')],
              ['average', t('Average of previous months')],
              ['weeklyAverage', t('Average of previous weeks')],
            ]}
            value={template.type}
            onChange={type => dispatch(updateTemplate({ type }))}
          />
        </FormField>
        <FormField style={{ flex: fieldFlex }}>
          <FormLabel
            title={
              template.type === 'weeklyAverage'
                ? t('Number of weeks back')
                : t('Number of months back')
            }
            htmlFor="look-back-field"
          />
          <Input
            id="look-back-field"
            type="number"
            min={1}
            step={1}
            value={rawPeriods}
            onChangeValue={setRawPeriods}
            onBlur={commitPeriods}
          />
        </FormField>
        {template.type === 'weeklyAverage' && (
          <FormField style={{ flex: fieldFlex }}>
            <FormLabel title={t('Once every')} htmlFor="weekday-field" />
            <Select
              id="weekday-field"
              options={[
                ['monday', t('Monday')],
                ['tuesday', t('Tuesday')],
                ['wednesday', t('Wednesday')],
                ['thursday', t('Thursday')],
                ['friday', t('Friday')],
                ['saturday', t('Saturday')],
                ['sunday', t('Sunday')],
              ]}
              value={template.weekday}
              onChange={weekday =>
                dispatch(updateTemplate({ type: 'weeklyAverage', weekday }))
              }
            />
          </FormField>
        )}
      </SpaceBetween>
      {(template.type === 'average' || template.type === 'weeklyAverage') && (
        <AmountAdjustment template={template} dispatch={dispatch} />
      )}
    </>
  );
};

function getPeriodCount(
  template: CopyTemplate | AverageTemplate | WeeklyAverageTemplate,
): number {
  switch (template.type) {
    case 'average':
      return template.numMonths;
    case 'weeklyAverage':
      return template.numWeeks;
    case 'copy':
      return template.lookBack;
    default:
      throw new Error(
        `Unknown historical template: ${String(template satisfies never)}`,
      );
  }
}
