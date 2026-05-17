import { Trans } from 'react-i18next';

import { amountToInteger } from '@actual-app/core/shared/util';
import type {
  AverageTemplate,
  ScheduleTemplate,
} from '@actual-app/core/types/models/templates';

import { useFormat } from '#hooks/useFormat';

type AmountAdjustmentSummaryProps = {
  template: ScheduleTemplate | AverageTemplate;
};

// Trailing clause for a template's increase or decrease adjustment, e.g.
// "(increased by 10%)". Renders nothing when no adjustment is set.
export function AmountAdjustmentSummary({
  template,
}: AmountAdjustmentSummaryProps) {
  const format = useFormat();

  if (template.adjustment === undefined) {
    return null;
  }

  const increase = template.adjustment >= 0;
  const magnitude = Math.abs(template.adjustment);

  if (template.adjustmentType === 'fixed') {
    const amount = format(
      amountToInteger(magnitude, format.currency.decimalPlaces),
      'financial',
    );
    return increase ? (
      <Trans>(increased by {{ amount }})</Trans>
    ) : (
      <Trans>(decreased by {{ amount }})</Trans>
    );
  }

  return increase ? (
    <Trans>(increased by {{ percent: magnitude }}%)</Trans>
  ) : (
    <Trans>(decreased by {{ percent: magnitude }}%)</Trans>
  );
}
