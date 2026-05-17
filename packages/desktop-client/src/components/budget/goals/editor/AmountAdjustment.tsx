import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';
import type {
  AverageTemplate,
  ScheduleTemplate,
} from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { FormField, FormLabel } from '#components/forms';
import { AmountInput } from '#components/util/AmountInput';
import { useFormat } from '#hooks/useFormat';

type AdjustableTemplate = ScheduleTemplate | AverageTemplate;
type AdjustmentType = 'percent' | 'fixed';
type UnitOption = 'none' | AdjustmentType;
type Direction = 'increase' | 'decrease';

// Seeded when an adjustment is first switched on.
const DEFAULT_MAGNITUDE = 10;

type AmountAdjustmentProps = {
  template: AdjustableTemplate;
  dispatch: (action: Action) => void;
};

// Editor for the optional increase/decrease modifier on schedule and average
// templates. `adjustment` is stored as a single signed number. The unit
// dropdown turns the adjustment on and off and picks percentage vs fixed
// amount. A percentage uses an increase/decrease selector for the direction;
// a fixed amount uses AmountInput, whose own sign is the direction.
export const AmountAdjustment = ({
  template,
  dispatch,
}: AmountAdjustmentProps) => {
  const { t } = useTranslation();
  const format = useFormat();

  const enabled = template.adjustment !== undefined;
  const adjustmentType: AdjustmentType = template.adjustmentType ?? 'percent';
  const adjustment = template.adjustment ?? 0;
  const increasing = adjustment >= 0;
  const magnitude = Math.abs(adjustment);

  const [rawMagnitude, setRawMagnitude] = useState(String(magnitude));
  // Resync when a different automation row is selected (the component
  // instance is reused across rows).
  useEffect(() => {
    setRawMagnitude(String(magnitude));
  }, [magnitude]);

  const apply = (
    next: number | undefined,
    type: AdjustmentType | undefined,
  ) => {
    if (template.type === 'schedule') {
      dispatch(
        updateTemplate({
          type: 'schedule',
          adjustment: next,
          adjustmentType: type,
        }),
      );
    } else {
      dispatch(
        updateTemplate({
          type: 'average',
          adjustment: next,
          adjustmentType: type,
        }),
      );
    }
  };

  const changeUnit = (unit: UnitOption) => {
    if (unit === 'none') {
      apply(undefined, undefined);
      return;
    }
    // Keep the current size when switching units; seed an increase when
    // switching on from off.
    apply(template.adjustment ?? DEFAULT_MAGNITUDE, unit);
  };

  const changeDirection = (direction: Direction) => {
    apply(direction === 'decrease' ? -magnitude : magnitude, 'percent');
  };

  const commitMagnitude = () => {
    const parsed = Number(rawMagnitude);
    const size = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setRawMagnitude(String(size));
    apply(increasing ? size : -size, 'percent');
  };

  return (
    <SpaceBetween gap={50} style={{ marginTop: 10 }}>
      <FormField style={{ flex: 1 }}>
        <FormLabel title={t('Adjustment')} htmlFor="adjustment-unit-field" />
        <SpaceBetween align="center" gap={12}>
          <Select
            id="adjustment-unit-field"
            value={enabled ? adjustmentType : 'none'}
            onChange={changeUnit}
            options={[
              ['none', t('No adjustment')],
              ['fixed', t('Fixed amount')],
              ['percent', t('Percentage')],
            ]}
            style={{ width: 160 }}
          />
          {enabled &&
            (adjustmentType === 'fixed' ? (
              <AmountInput
                id="adjustment-amount-field"
                zeroSign="+"
                value={amountToInteger(
                  adjustment,
                  format.currency.decimalPlaces,
                )}
                onUpdate={next =>
                  apply(
                    integerToAmount(next, format.currency.decimalPlaces),
                    'fixed',
                  )
                }
                style={{ flex: 'none', width: 140 }}
              />
            ) : (
              <>
                <Select
                  id="adjustment-direction-field"
                  value={increasing ? 'increase' : 'decrease'}
                  onChange={changeDirection}
                  options={[
                    ['increase', t('Increase')],
                    ['decrease', t('Decrease')],
                  ]}
                  style={{ width: 150 }}
                />
                <Input
                  id="adjustment-amount-field"
                  inputMode="decimal"
                  style={{ width: 120 }}
                  value={rawMagnitude}
                  onChangeValue={setRawMagnitude}
                  onBlur={commitMagnitude}
                />
              </>
            ))}
        </SpaceBetween>
      </FormField>
    </SpaceBetween>
  );
};
