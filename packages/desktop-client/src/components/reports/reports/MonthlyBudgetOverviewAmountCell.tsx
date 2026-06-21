import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

type MonthlyBudgetOverviewAmountCellProps = {
  amount: number;
  emphasize?: boolean;
  color?: string;
};

export function MonthlyBudgetOverviewAmountCell({
  amount,
  emphasize = false,
  color,
}: MonthlyBudgetOverviewAmountCellProps) {
  const format = useFormat();

  return (
    <FinancialText
      style={{
        fontWeight: emphasize ? 600 : undefined,
        color,
      }}
    >
      <PrivacyFilter>{format(amount, 'financial')}</PrivacyFilter>
    </FinancialText>
  );
}
