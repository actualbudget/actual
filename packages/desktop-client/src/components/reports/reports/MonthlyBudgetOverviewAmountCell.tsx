import { Trans } from 'react-i18next';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

type AmountCellProps = {
  amount: number;
  average?: number;
  showAverage: boolean;
  emphasize?: boolean;
  errorColor?: string;
};

export function MonthlyBudgetOverviewAmountCell({
  amount,
  average,
  showAverage,
  emphasize = false,
  errorColor,
}: AmountCellProps) {
  const format = useFormat();

  return (
    <>
      <FinancialText
        style={{
          fontWeight: emphasize ? 600 : undefined,
          color: errorColor,
        }}
      >
        <PrivacyFilter>{format(amount, 'financial')}</PrivacyFilter>
      </FinancialText>
      {showAverage && average != null && (
        <FinancialText
          style={{
            fontSize: 12,
            color: errorColor,
            opacity: 0.85,
          }}
        >
          <PrivacyFilter>
            {format(average, 'financial')} <Trans>avg</Trans>
          </PrivacyFilter>
        </FinancialText>
      )}
    </>
  );
}
