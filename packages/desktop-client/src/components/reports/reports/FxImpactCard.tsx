import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { MAX_SAFE_NUMBER } from '@actual-app/core/shared/util';
import type {
  FxChanges,
  FxImpactMonth,
  FxImpactWidget,
  TimeFrame,
} from '@actual-app/core/types/models';

import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateTimeRange } from '#components/reports/reportRanges';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { fxImpactSelection, useFxImpact } from '#hooks/useFxImpact';
import { useMulticurrencyAvailable } from '#hooks/useMulticurrencyAvailable';

import { FxAmount } from './FxImpactTable';

/** The last twelve months, moving with the current month. */
export function defaultFxImpactTimeFrame(): TimeFrame {
  return {
    start: monthUtils.subMonths(monthUtils.currentMonth(), 11),
    end: monthUtils.currentMonth(),
    mode: 'sliding-window',
  };
}

/** A selected-total field summed over the range: null if any month is unknown or the sum is out of range. */
export function sumFxRange(
  months: FxImpactMonth[],
  field: keyof FxChanges,
): number | null {
  let sum = 0n;
  for (const month of months) {
    const value = month.total[field];
    if (value === null) return null;
    sum += BigInt(value);
  }
  const bound = BigInt(MAX_SAFE_NUMBER);
  return sum > bound || sum < -bound ? null : Number(sum);
}

type FxImpactCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: FxImpactWidget['meta'];
  onMetaChange: (newMeta: FxImpactWidget['meta']) => void;
};

export function FxImpactCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
}: FxImpactCardProps) {
  const { t } = useTranslation();
  const isAvailable = useMulticurrencyAvailable();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    defaultFxImpactTimeFrame(),
  );
  const selection = fxImpactSelection(
    start,
    end,
    meta?.accounts,
    meta?.currencies,
  );
  // An unavailable budget keeps the saved configuration and reads nothing.
  const { data, isError } = useFxImpact(isAvailable ? selection : null);

  const figures = data && [
    { label: t('Realized'), value: sumFxRange(data.months, 'realized') },
    {
      label: t('Unrealized change'),
      value: sumFxRange(data.months, 'unrealized'),
    },
    {
      label: t('Internal settlement'),
      value: sumFxRange(data.months, 'settlement'),
    },
  ];
  const isIncomplete =
    !!data &&
    (data.months.some(month => month.total.incompleteAccountIds.length > 0) ||
      !!figures?.some(figure => figure.value === null));

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/fx-impact/${widgetId}`}
      onRename={() => setNameMenuOpen(true)}
    >
      <View style={{ flex: 1, padding: 20, gap: 10 }}>
        <View>
          <ReportCardName
            name={meta?.name || t('FX impact')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({ ...meta, name: newName });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          <DateRange
            start={monthUtils.getMonth(start)}
            end={monthUtils.getMonth(end)}
          />
        </View>
        {!isAvailable ? (
          <p style={{ margin: 0 }}>
            <Trans>
              The FX impact report needs multicurrency, which is turned off for
              this budget.
            </Trans>
          </p>
        ) : !selection ? (
          <p style={{ margin: 0 }}>
            <Trans>Choose a range of 120 months or fewer.</Trans>
          </p>
        ) : figures ? (
          <CurrencyFormatProvider
            currencyCode={data.budgetCurrency}
            precision={data.basePrecision}
          >
            <dl style={{ margin: 0, display: 'grid', gap: 6 }}>
              {figures.map(figure => (
                <div
                  key={figure.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <dt>{figure.label}</dt>
                  <dd style={{ margin: 0, ...styles.mediumText }}>
                    <FxAmount value={figure.value} />
                  </dd>
                </div>
              ))}
            </dl>
            {isIncomplete && (
              <p style={{ margin: 0, color: theme.warningText }}>
                <Trans>Incomplete</Trans>
              </p>
            )}
            {isError && (
              <p role="alert" style={{ margin: 0 }}>
                <Trans>
                  Could not refresh. These figures are from the last successful
                  read.
                </Trans>
              </p>
            )}
          </CurrencyFormatProvider>
        ) : isError ? (
          <p role="alert" style={{ margin: 0 }}>
            <Trans>Could not load the FX impact report.</Trans>
          </p>
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
