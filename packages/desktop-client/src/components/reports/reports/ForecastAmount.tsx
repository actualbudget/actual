import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

export function ForecastAmount({ amount }: { amount: number }) {
  const format = useFormat();
  return (
    <FinancialText style={{ whiteSpace: 'nowrap' }}>
      <PrivacyFilter>{format(amount, 'financial-with-sign')}</PrivacyFilter>
    </FinancialText>
  );
}
