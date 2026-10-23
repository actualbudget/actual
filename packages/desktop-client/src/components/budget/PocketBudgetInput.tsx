import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { PocketMonth } from '@actual-app/core/server/budget/pocket-readers';
import { useQueryClient } from '@tanstack/react-query';

import { useStatusMessage } from '#components/modals/PocketActions';
import { FinancialInput } from '#components/util/FinancialInput';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';

import { NativeAmount } from './pocketDisplay';

type EditContext = {
  pocketId: string;
  month: string;
  currency: string;
  precision: number;
};

export function PocketBudgetInput({
  pocket,
  month,
  name,
}: {
  pocket: PocketMonth;
  month: string;
  name: string;
}) {
  const { t } = useTranslation();
  const statusMessage = useStatusMessage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  // A refresh cannot reinterpret an integer typed in another precision or month.
  const context = editing ?? {
    pocketId: pocket.id,
    month,
    currency: pocket.currency,
    precision: pocket.precision,
  };

  async function save(amount: number) {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await send('budget/pocket-budget-set', {
        month: context.month,
        pocketId: context.pocketId,
        amount,
        encoding: `${context.currency}.${context.precision}`,
      });
      const message = statusMessage(result);
      if (message) {
        setError(message);
      } else {
        await queryClient.invalidateQueries({
          queryKey: ['budget', 'category-pockets'],
        });
      }
    } catch {
      setError(t('The budget could not be saved. Try again.'));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  if (pocket.budgeted === null) {
    return (
      <NativeAmount
        value={null}
        currency={pocket.currency}
        precision={pocket.precision}
      />
    );
  }
  return (
    <CurrencyFormatProvider
      currencyCode={context.currency}
      precision={context.precision}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <FinancialInput
          aria-label={t('Budgeted for {{name}}', { name })}
          value={pocket.budgeted}
          disabled={saving}
          onFocus={() => {
            setEditing(context);
            setError(null);
          }}
          onBlur={() => setEditing(null)}
          onUpdate={save}
          style={{
            width: '100%',
            textAlign: 'right',
            border: 0,
            padding: 0,
            backgroundColor: 'transparent',
          }}
        />
        {error && (
          <Text role="alert" style={{ color: theme.errorText }}>
            {error}
          </Text>
        )}
      </View>
    </CurrencyFormatProvider>
  );
}
