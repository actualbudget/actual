import React, { useMemo, useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { View } from '@actual-app/components/view';

import { type IntegerAmount } from 'loot-core/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';

import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import {
  addToBeBudgetedGroup,
  removeCategoriesFromGroups,
} from '@desktop-client/components/budget/util';
import { FinancialInput } from '@desktop-client/components/util/FinancialInput';
import { useCategories } from '@desktop-client/hooks/useCategories';

type TransferMenuProps = {
  categoryId?: CategoryEntity['id'];
  initialAmount?: IntegerAmount | null;
  showToBeBudgeted?: boolean;
  onSubmit: (amount: IntegerAmount, categoryId: CategoryEntity['id']) => void;
  onClose: () => void;
};

export function TransferMenu({
  categoryId,
  initialAmount = 0,
  showToBeBudgeted,
  onSubmit,
  onClose,
}: TransferMenuProps) {
  const { grouped: originalCategoryGroups } = useCategories();
  const filteredCategoryGroups = useMemo(() => {
    const expenseCategoryGroups = originalCategoryGroups.filter(
      g => !g.is_income,
    );
    const categoryGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(expenseCategoryGroups)
      : expenseCategoryGroups;
    return categoryId
      ? removeCategoriesFromGroups(categoryGroups, categoryId)
      : categoryGroups;
  }, [originalCategoryGroups, categoryId, showToBeBudgeted]);

  const [amount, setAmount] = useState<IntegerAmount>(
    Math.max(initialAmount ?? 0, 0),
  );
  const [toCategoryId, setToCategoryId] = useState<string | null>(null);

  const _onSubmit = () => {
    if (amount != null && amount > 0 && toCategoryId) {
      onSubmit(amount, toCategoryId);
    }
    onClose();
  };

  return (
    <Form
      onSubmit={e => {
        e.preventDefault();
        _onSubmit();
      }}
    >
      <View style={{ padding: 10 }}>
        <View style={{ marginBottom: 5 }}>
          <Trans>Transfer this amount:</Trans>
        </View>
        <View>
          <InitialFocus>
            <FinancialInput value={amount} onUpdate={setAmount} />
          </InitialFocus>
        </View>
        <View style={{ margin: '10px 0 5px 0' }}>
          <Trans>To:</Trans>
        </View>

        <CategoryAutocomplete
          categoryGroups={filteredCategoryGroups}
          value={null}
          openOnFocus={true}
          onSelect={(id: string | undefined) => setToCategoryId(id || null)}
          inputProps={{
            placeholder: '(none)',
          }}
          showHiddenCategories={true}
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
            isDisabled={!toCategoryId || amount <= 0}
            style={{
              fontSize: 12,
              paddingTop: 3,
              paddingBottom: 3,
            }}
          >
            <Trans>Transfer</Trans>
          </Button>
        </View>
      </View>
    </Form>
  );
}
