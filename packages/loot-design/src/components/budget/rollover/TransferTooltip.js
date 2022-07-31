import React, { useState, useContext, useEffect } from 'react';
import { integerToCurrency, amountToInteger } from '@actual-app/loot-core/src/shared/util';
import evalArithmetic from '@actual-app/loot-core/src/shared/arithmetic';
import { View, Button, Tooltip, InitialFocus, Input } from '../../common';
import SpreadsheetContext from '../../spreadsheet/SpreadsheetContext';
import NamespaceContext from '../../spreadsheet/NamespaceContext';
import { addToBeBudgetedGroup } from '../util';
import CategoryAutocomplete from '../../CategorySelect';
import { CategoryGroupsContext } from '../util';

export default function TransferTooltip({
  initialAmount,
  initialAmountName,
  showToBeBudgeted,
  tooltipProps,
  onSubmit,
  onClose
}) {
  let spreadsheet = useContext(SpreadsheetContext);
  let sheetName = useContext(NamespaceContext);
  let categoryGroups = useContext(CategoryGroupsContext);

  categoryGroups = categoryGroups.filter(g => !g.is_income);
  if (showToBeBudgeted) {
    categoryGroups = addToBeBudgetedGroup(categoryGroups);
  }

  let [amount, setAmount] = useState(null);
  let [category, setCategory] = useState(null);

  useEffect(() => {
    (async () => {
      if (initialAmountName) {
        const node = await spreadsheet.get(sheetName, initialAmountName);
        setAmount(integerToCurrency(Math.max(node.value, 0)));
      } else {
        setAmount(integerToCurrency(Math.max(initialAmount, 0)));
      }
    })();
  }, []);

  function submit() {
    let parsedAmount = evalArithmetic(amount, null);
    if (parsedAmount && category) {
      onSubmit(amountToInteger(parsedAmount), category);
      onClose();
    }
  }

  if (amount === null) {
    // Don't render anything until we have the amount to show. This
    // ensures that the amount field is focused and fully selected
    // when it's initially rendered (instead of being updated
    // afterwards and losing selection)
    return null;
  }

  return (
    <Tooltip
      position="bottom-right"
      width={200}
      style={{ padding: 10 }}
      {...tooltipProps}
      onClose={onClose}
    >
      <View style={{ marginBottom: 5 }}>Transfer this amount:</View>
      <View>
        <InitialFocus>
          <Input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onEnter={submit}
          />
        </InitialFocus>
      </View>
      <View style={{ margin: '10px 0 5px 0' }}>To:</View>

      <CategoryAutocomplete
        categoryGroups={categoryGroups}
        value={null}
        openOnFocus={false}
        onUpdate={id => {}}
        onSelect={id => setCategory(id)}
        inputProps={{
          onKeyDown: e => {
            if (e.keyCode === 13) {
              submit();
            }
          }
        }}
      />

      <View
        style={{
          alignItems: 'flex-end',
          marginTop: 10
        }}
      >
        <Button
          primary
          style={{
            fontSize: 12,
            paddingTop: 3,
            paddingBottom: 3
          }}
          onClick={submit}
        >
          Transfer
        </Button>
      </View>
    </Tooltip>
  );
}
