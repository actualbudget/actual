import type { ReactNode } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type UsageProgress = {
  percent: number;
  normalFilled: number;
  overflowLines: number[];
};

const DASH_COUNT = 10;
const MAX_OVERFLOW_LINES = 3;

export function getUsageProgress(
  budgeted: number,
  spent: number,
): UsageProgress | null {
  const budgetAmount = Math.max(0, budgeted);
  const spentAmount = Math.max(0, -spent);

  if (budgetAmount <= 0) {
    return null;
  }

  const percent = spentAmount / budgetAmount;
  const overflowPercent = Math.max(percent - 1, 0);
  const overflowLines = Array.from(
    { length: Math.min(Math.ceil(overflowPercent), MAX_OVERFLOW_LINES) },
    (_, index) =>
      Math.min(Math.ceil((overflowPercent - index) * DASH_COUNT), DASH_COUNT),
  );

  return {
    percent,
    normalFilled: Math.min(Math.ceil(percent * DASH_COUNT), DASH_COUNT),
    overflowLines,
  };
}

export function UsageProgressDashes({
  budgeted,
  spent,
}: {
  budgeted: number;
  spent: number;
}) {
  const progress = getUsageProgress(budgeted, spent);

  if (!progress) {
    return null;
  }

  const isOverflowing = progress.overflowLines.length > 0;
  const dashHeight = isOverflowing ? 5 : 14;
  const percentLabel = `${Math.round(progress.percent * 100)}%`;

  function renderDashes(filled: number, color: string, height: number) {
    return Array.from({ length: DASH_COUNT }, (_, index) => (
      <View
        key={index}
        data-testid="usage-dash"
        style={{
          width: 3,
          height,
          borderRadius: 1,
          backgroundColor: index < filled ? color : theme.tableBorder,
          opacity: index < filled ? 1 : 0.35,
        }}
      />
    ));
  }

  return (
    <View
      aria-label={percentLabel}
      title={percentLabel}
      style={{
        gap: isOverflowing ? 2 : 0,
        justifyContent: 'center',
        alignItems: 'flex-end',
      }}
    >
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {renderDashes(
          progress.normalFilled,
          theme.budgetNumberPositive,
          dashHeight,
        )}
      </View>
      {progress.overflowLines.map((filled, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: 3 }}>
          {renderDashes(filled, theme.budgetNumberNegative, 5)}
        </View>
      ))}
    </View>
  );
}

export function UsageCell({
  progress,
  balance,
  balanceVisible = false,
}: {
  progress: ReactNode;
  balance: ReactNode;
  balanceVisible?: boolean;
}) {
  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        alignItems: 'center',
        width: '100%',
        minWidth: 0,
        ':hover .usage-progress, :focus-within .usage-progress': {
          opacity: 0,
        },
        ':hover .usage-balance, :focus-within .usage-balance': {
          opacity: 1,
        },
      }}
    >
      <View
        className="usage-progress"
        style={{
          gridArea: '1 / 1',
          alignItems: 'flex-end',
          opacity: balanceVisible ? 0 : 1,
          transition: 'opacity .12s ease',
        }}
      >
        {progress}
      </View>
      <View
        className="usage-balance"
        style={{
          gridArea: '1 / 1',
          alignItems: 'flex-end',
          opacity: balanceVisible ? 1 : 0,
          transition: 'opacity .12s ease',
        }}
      >
        {balance}
      </View>
    </View>
  );
}
