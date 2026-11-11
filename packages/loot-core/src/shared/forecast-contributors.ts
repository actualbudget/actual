import * as monthUtils from '#shared/months';
import type { ForecastDataPoint } from '#types/models/forecast';

export type ForecastContributor = {
  scheduleId: string;
  scheduleName: string;
  amount: number;
  count: number;
  isTransfer: boolean;
  isAccountless: boolean;
};

/** Monthly points represent complete months; Daily preserves exact day bounds. */
export function getForecastRange(
  start: string,
  end: string,
  granularity: 'Daily' | 'Monthly',
) {
  return {
    startDate:
      granularity === 'Daily' && !monthUtils.isValidYearMonth(start)
        ? start
        : monthUtils.firstDayOfMonth(start),
    endDate:
      granularity === 'Daily' && !monthUtils.isValidYearMonth(end)
        ? end
        : monthUtils.lastDayOfMonth(end),
  };
}

/** Summarize the same filtered daily points used by the chart, in integer cents. */
export function summarizeForecastContributors(
  dataPoints: ForecastDataPoint[],
  startDate: string,
  endDate: string,
) {
  const points = dataPoints.filter(
    point => point.date >= startDate && point.date <= endDate,
  );
  if (
    points.length === 0 ||
    points.some(point => point.recordedAmount === undefined)
  ) {
    // Older results and tracking-budget forecasts have no recorded provenance.
    return null;
  }

  const openingByAccount = new Map<string, { date: string; balance: number }>();
  const endingByAccount = new Map<string, ForecastDataPoint>();
  const occurrences = new Map<string, ForecastContributor>();
  let recordedNet = 0;

  for (const point of points) {
    const recordedAmount = point.recordedAmount ?? 0;
    recordedNet += recordedAmount;
    const opening = openingByAccount.get(point.accountId);
    if (!opening || point.date < opening.date) {
      openingByAccount.set(point.accountId, {
        date: point.date,
        balance:
          point.balance -
          recordedAmount -
          point.transactions.reduce(
            (sum, transaction) => sum + transaction.amount,
            0,
          ),
      });
    }
    const ending = endingByAccount.get(point.accountId);
    if (!ending || point.date > ending.date) {
      endingByAccount.set(point.accountId, point);
    }

    for (const transaction of point.transactions) {
      // Net transfer legs only after filtering, and count each occurrence once.
      const key = JSON.stringify([
        transaction.scheduleId,
        transaction.occurrenceDate ?? point.date,
      ]);
      const occurrence = occurrences.get(key);
      if (occurrence) {
        occurrence.amount += transaction.amount;
        occurrence.isTransfer ||= transaction.isTransfer ?? false;
        occurrence.isAccountless ||= transaction.isAccountless ?? false;
      } else {
        occurrences.set(key, {
          scheduleId: transaction.scheduleId,
          scheduleName: transaction.scheduleName,
          amount: transaction.amount,
          count: 1,
          isTransfer: transaction.isTransfer ?? false,
          isAccountless: transaction.isAccountless ?? false,
        });
      }
    }
  }

  const groups = new Map<string, ForecastContributor>();
  let internalTransferCount = 0;
  for (const occurrence of occurrences.values()) {
    if (occurrence.amount === 0) {
      if (occurrence.isTransfer) {
        internalTransferCount++;
      }
      continue;
    }
    // A schedule may change direction after rules run. Keep both sides visible.
    const key = JSON.stringify([occurrence.scheduleId, occurrence.amount > 0]);
    const group = groups.get(key);
    if (group) {
      group.amount += occurrence.amount;
      group.count++;
      group.isTransfer ||= occurrence.isTransfer;
      group.isAccountless ||= occurrence.isAccountless;
    } else {
      groups.set(key, { ...occurrence });
    }
  }

  const contributors = [...groups.values()].sort(
    (a, b) =>
      Math.abs(b.amount) - Math.abs(a.amount) ||
      a.scheduleName.localeCompare(b.scheduleName) ||
      a.scheduleId.localeCompare(b.scheduleId),
  );
  return {
    openingBalance: [...openingByAccount.values()].reduce(
      (sum, point) => sum + point.balance,
      0,
    ),
    endingBalance: [...endingByAccount.values()].reduce(
      (sum, point) => sum + point.balance,
      0,
    ),
    recordedNet,
    scheduledNet: contributors.reduce(
      (sum, contributor) => sum + contributor.amount,
      0,
    ),
    inflows: contributors.filter(contributor => contributor.amount > 0),
    outflows: contributors.filter(contributor => contributor.amount < 0),
    internalTransferCount,
  };
}
