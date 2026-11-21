import React, { useMemo, useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import { evalArithmetic } from '@actual-app/core/shared/arithmetic';
import {
  amountToInteger,
  integerToCurrency,
} from '@actual-app/core/shared/util';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { CategoryAutocomplete } from '#components/autocomplete/CategoryAutocomplete';
import {
  addToBeBudgetedGroup,
  removeCategoriesFromGroups,
} from '#components/budget/util';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';

type CoverMenuProps = {
  showToBeBudgeted?: boolean;
  // The currency of the amount, when it is a currency line's
  currencyCode?: string;
  initialAmount?: IntegerAmount | null;
  categoryId?: CategoryEntity['id'];
  onSubmit: (amount: IntegerAmount, categoryId: CategoryEntity['id']) => void;
  onClose: () => void;
};

export function CoverMenu({
  showToBeBudgeted = true,
  currencyCode,
  initialAmount = 0,
  categoryId,
  onSubmit,
  onClose,
}: CoverMenuProps) {
  const { t } = useTranslation();

  const { data: { grouped: originalCategoryGroups } = { grouped: [] } } =
    useCategories();

  const [fromCategoryId, setFromCategoryId] = useState<string | null>(null);

  const filteredCategoryGroups = useMemo(() => {
    const expenseGroups = originalCategoryGroups.filter(g => !g.is_income);
    const categoryGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(expenseGroups)
      : expenseGroups;
    return categoryId
      ? removeCategoriesFromGroups(categoryGroups, categoryId)
      : categoryGroups;
  }, [categoryId, showToBeBudgeted, originalCategoryGroups]);

  const format = useFormat();
  // An amount in another currency has the decimal places of that currency
  const _initialAmount = currencyCode
    ? format.forEdit(Math.abs(initialAmount ?? 0), { currencyCode })
    : integerToCurrency(Math.abs(initialAmount ?? 0));
  const [amount, setAmount] = useState<string>(_initialAmount);

  function _onSubmit() {
    const parsedAmount = evalArithmetic(amount || '');
    if (parsedAmount && fromCategoryId) {
      onSubmit(amountToInteger(parsedAmount), fromCategoryId);
    }
    onClose();
  }

  return (
    <Form
      onSubmit={e => {
        e.preventDefault();
        _onSubmit();
      }}
    >
      <View style={{ padding: 10 }}>
        <View style={{ marginBottom: 5 }}>
          {currencyCode ? (
            <Trans>Cover this amount ({{ currencyCode }}):</Trans>
          ) : (
            <Trans>Cover this amount:</Trans>
          )}
        </View>
        <View>
          <Input
            defaultValue={_initialAmount}
            onUpdate={setAmount}
            onChangeValue={setAmount}
            style={styles.tnum}
          />
        </View>
        <View style={{ margin: '10px 0 5px 0' }}>
          <Trans>From:</Trans>
        </View>

        <CategoryAutocomplete
          categoryGroups={filteredCategoryGroups}
          value={null}
          focused
          openOnFocus
          onSelect={(id: string | undefined) => setFromCategoryId(id || null)}
          inputProps={{
            placeholder: t('(none)'),
          }}
          showHiddenCategories={false}
          showOwnBalances
        />

        <View
          style={{
            alignItems: 'flex-end',
            marginTop: 10,
          }}
        >
          <Button
            type="submit"
            variant="primary"
            style={{
              fontSize: 12,
              paddingTop: 3,
            }}
          >
            <Trans>Transfer</Trans>
          </Button>
        </View>
      </View>
    </Form>
  );
}
