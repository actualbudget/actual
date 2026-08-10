import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  DashboardDateScope,
  TimeFrame,
} from '@actual-app/core/types/models';

import { Header } from './Header';

type DashboardDateRangeControlsProps = {
  timeFrame: TimeFrame | null;
  scope: DashboardDateScope | null;
  onChange: (timeFrame: TimeFrame) => void;
  onClear: () => void;
  allMonths: Array<{ name: string }>;
  earliestTransaction: string;
  latestTransaction: string;
};

export function DashboardDateRangeControls({
  timeFrame,
  scope,
  onChange,
  onClear,
  allMonths,
  earliestTransaction,
  latestTransaction,
}: DashboardDateRangeControlsProps) {
  const { t } = useTranslation();
  const displayedTimeFrame = timeFrame ?? {
    start: monthUtils.subMonths(monthUtils.currentMonth(), 5),
    end: monthUtils.currentMonth(),
    mode: 'sliding-window',
  };

  return (
    <View
      data-testid="dashboard-date-range-controls"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 5,
        opacity: timeFrame ? 1 : 0.6,
      }}
    >
      <Header
        allMonths={allMonths}
        start={displayedTimeFrame.start}
        end={displayedTimeFrame.end}
        mode={displayedTimeFrame.mode}
        resolvedTimeFrame={scope ?? undefined}
        dateRangeLabel={t('Widget timeframe')}
        hideModeToggle
        preserveRangeOnModeChange
        contentPadding={0}
        earliestTransaction={earliestTransaction}
        latestTransaction={latestTransaction}
        onChangeDates={(start, end, mode) => onChange({ start, end, mode })}
        inlineContent={
          timeFrame && (
            <Button variant="bare" onPress={onClear}>
              <Trans>Clear</Trans>
            </Button>
          )
        }
      />
    </View>
  );
}
