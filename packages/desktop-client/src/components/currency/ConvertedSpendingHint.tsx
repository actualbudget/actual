import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgInformationCircle } from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models';

import {
  addCurrencyLine,
  addCurrencyLines,
  listCurrencies,
} from '#components/budget/categoryCurrencyModals';
import { useAccounts } from '#hooks/useAccounts';
import { useConvertedSpending } from '#hooks/useCategoryCurrencies';
import { useFormat } from '#hooks/useFormat';
import { useDispatch } from '#redux';

type ConvertedSpendingHintProps = {
  category: Pick<CategoryEntity, 'id' | 'name'>;
  month: string;
};

// What a category converts in `month` from currencies it has no line in:
// a sentence per account, and the currencies a line could be added for.
// Shared by the budget table and the category menu on a phone.
export function useConvertedSpendingNotes(
  categoryId: CategoryEntity['id'],
  month: string,
): { notes: Array<{ key: string; text: string }>; currencies: string[] } {
  const { t } = useTranslation();
  const format = useFormat();
  const { data: accounts = [] } = useAccounts();
  const converted = useConvertedSpending(categoryId, month);

  return {
    notes: converted.map(row => ({
      key: row.account,
      text: t(
        "Includes {{amount}} from {{account}}, converted at each transaction's date.",
        {
          amount: format(Math.abs(row.amount), 'financial', {
            currencyCode: row.currency,
          }),
          account:
            accounts.find(account => account.id === row.account)?.name ??
            row.account,
        },
      ),
    })),
    currencies: [...new Set(converted.map(row => row.currency))],
  };
}

// Tells that a category's spending in `month` includes amounts converted
// from currencies it has no line in, and offers to add lines in them to the
// category, so no spending is converted without the user knowing
export function ConvertedSpendingHint({
  category,
  month,
}: ConvertedSpendingHintProps) {
  const { notes, currencies } = useConvertedSpendingNotes(category.id, month);
  if (notes.length === 0) {
    return null;
  }
  return (
    <ConvertedSpendingButton
      category={category}
      month={month}
      notes={notes}
      currencies={currencies}
    />
  );
}

function ConvertedSpendingButton({
  category,
  month,
  notes,
  currencies,
}: {
  category: Pick<CategoryEntity, 'id' | 'name'>;
  month: string;
  notes: Array<{ key: string; text: string }>;
  currencies: string[];
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    // Keeps a press from also opening the category's activity
    <View
      onClick={e => e.stopPropagation()}
      style={{ flexShrink: 0, marginRight: 'auto' }}
    >
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label={t('Spending converted from {{currencies}}', {
          currencies: currencies.join(', '),
        })}
        style={{ padding: 2, color: theme.pageTextLight }}
        onPress={() => setIsOpen(true)}
      >
        <SvgInformationCircle width={12} height={12} />
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom end"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
        style={{ width: 300, padding: 12 }}
      >
        <View style={{ gap: 10, lineHeight: 1.5 }}>
          {notes.map(note => (
            <Text key={note.key}>{note.text}</Text>
          ))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {/* Lines for this category from this month on */}
            {currencies.map(currency => (
              <Button
                key={currency}
                onPress={() => {
                  setIsOpen(false);
                  void addCurrencyLine(dispatch, t, category, currency, month);
                }}
              >
                {t('Add a {{currency}} line', { currency })}
              </Button>
            ))}
            {currencies.length > 1 && (
              <Button
                onPress={() => {
                  setIsOpen(false);
                  void addCurrencyLines(
                    dispatch,
                    t,
                    category,
                    currencies,
                    month,
                  );
                }}
              >
                {t('Add {{currencies}} lines', {
                  currencies: listCurrencies(currencies, i18n.language),
                })}
              </Button>
            )}
          </View>
        </View>
      </Popover>
    </View>
  );
}
