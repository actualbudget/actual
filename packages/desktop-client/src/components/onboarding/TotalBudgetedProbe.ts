import { useEffect } from 'react';

import { useSheetValue } from '#hooks/useSheetValue';
import { envelopeBudget } from '#spreadsheet/bindings';

type TotalBudgetedProbeProps = {
  onChange: (value: number | null) => void;
};

// Reads this month's total budgeted amount. Both budget types expose it
// under the same "total-budgeted" name. Rendered inside a SheetNameProvider
// for the current month so the binding resolves without affecting the rest
// of the app.
export function TotalBudgetedProbe({ onChange }: TotalBudgetedProbeProps) {
  const value = useSheetValue<'envelope-budget', 'total-budgeted'>(
    envelopeBudget.totalBudgeted,
  );
  useEffect(() => {
    onChange(typeof value === 'number' ? value : null);
  }, [value, onChange]);
  return null;
}
