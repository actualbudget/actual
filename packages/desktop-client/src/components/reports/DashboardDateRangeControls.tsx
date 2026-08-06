import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  DashboardDateScope,
  DashboardPageEntity,
  TimeFrame,
} from '@actual-app/core/types/models';

import { useUpdateDashboardDateRangeMutation } from '#reports/mutations';

import { Header } from './Header';

type DashboardDateRangeControlsProps = {
  dashboard: DashboardPageEntity;
  scope: DashboardDateScope | null;
  allMonths: Array<{ name: string }>;
  earliestTransaction: string;
  latestTransaction: string;
};

export function DashboardDateRangeControls({
  dashboard,
  scope,
  allMonths,
  earliestTransaction,
  latestTransaction,
}: DashboardDateRangeControlsProps) {
  const updateDateRange = useUpdateDashboardDateRangeMutation();
  const timeFrame: TimeFrame = dashboard.time_frame ?? {
    start: monthUtils.subMonths(monthUtils.currentMonth(), 5),
    end: monthUtils.currentMonth(),
    mode: 'sliding-window',
  };

  function update(time_frame: TimeFrame) {
    updateDateRange.mutate({
      id: dashboard.id,
      date_range_enabled: true,
      time_frame,
    });
  }

  if (!dashboard.date_range_enabled || !scope) {
    return null;
  }

  return (
    <View
      data-testid="dashboard-date-range-controls"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 5,
      }}
    >
      <Header
        allMonths={allMonths}
        start={timeFrame.start}
        end={timeFrame.end}
        mode={timeFrame.mode}
        resolvedTimeFrame={scope}
        preserveRangeOnModeChange
        contentPadding={0}
        earliestTransaction={earliestTransaction}
        latestTransaction={latestTransaction}
        onChangeDates={(start, end, mode) => update({ start, end, mode })}
      />
    </View>
  );
}
