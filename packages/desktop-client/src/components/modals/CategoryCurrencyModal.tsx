import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { getEffectiveCurrency } from '@actual-app/core/shared/fx/currency';
import * as monthUtils from '@actual-app/core/shared/months';

import { addCurrencyLine } from '#components/budget/categoryCurrencyModals';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { useCurrencyOptions } from '#components/currency/useCurrencyOptions';
import { useAccounts } from '#hooks/useAccounts';
import { useCategoryCurrencies } from '#hooks/useCategoryCurrencies';
import { useLocale } from '#hooks/useLocale';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type CategoryCurrencyModalProps = Extract<
  ModalType,
  { name: 'category-currency-add' }
>['options'];

// Adds a line in any currency to one category from the month on screen,
// such as one for a trip abroad
export function CategoryCurrencyModal({
  category,
  month,
}: CategoryCurrencyModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const locale = useLocale();
  const { defaultCurrencyCode } = useMultiCurrency();
  const { getLines } = useCategoryCurrencies();
  const { getAccountCurrencyOptions } = useCurrencyOptions();
  const { data: accounts = [] } = useAccounts();

  // The currencies of open accounts come first; those the category already
  // has a line in from this month are left out
  const { accountOptions, otherOptions } = useMemo(() => {
    const taken = new Set([
      defaultCurrencyCode,
      ...getLines(category.id)
        .filter(line => !line.startMonth || line.startMonth <= month)
        .map(line => line.currencyCode),
    ]);
    const accountCurrencies = new Set(
      accounts
        .filter(account => !account.closed)
        .map(account =>
          getEffectiveCurrency(account.currency, defaultCurrencyCode),
        ),
    );
    const available = getAccountCurrencyOptions(null).filter(
      ([code]) => !taken.has(code),
    );
    return {
      accountOptions: available.filter(([code]) => accountCurrencies.has(code)),
      otherOptions: available.filter(([code]) => !accountCurrencies.has(code)),
    };
  }, [
    accounts,
    category.id,
    defaultCurrencyCode,
    getAccountCurrencyOptions,
    getLines,
    month,
  ]);

  const [chosen, setChosen] = useState<string | null>(null);
  const currency = chosen ?? (accountOptions[0] ?? otherOptions[0])?.[0] ?? '';

  return (
    <Modal name="category-currency-add">
      {({ state }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle
                title={t('Add a currency line to {{name}}', {
                  name: category.name,
                })}
                shrinkOnOverflow
              />
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: 15, maxWidth: 460, lineHeight: 1.5 }}>
            <Paragraph style={{ margin: 0 }}>
              {t(
                'The line starts in {{month}} and stays in the months after, budgeted in its currency. Earlier months stay as they were budgeted.',
                { month: monthUtils.format(month, 'MMMM yyyy', locale) },
              )}
            </Paragraph>

            <View style={{ gap: 5 }}>
              <label htmlFor="category-currency">
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Currency</Trans>
                </Text>
              </label>
              <Select
                id="category-currency"
                value={currency}
                options={
                  accountOptions.length > 0
                    ? [...accountOptions, Menu.line, ...otherOptions]
                    : otherOptions
                }
                onChange={setChosen}
                style={{ maxWidth: '100%' }}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <Button onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                isDisabled={!currency}
                onPress={() => {
                  state.close();
                  void addCurrencyLine(dispatch, t, category, currency, month);
                }}
              >
                {t('Add a {{currency}} line', { currency })}
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
