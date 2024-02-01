// @ts-strict-ignore
import React, {
  useState,
  useContext,
  useEffect,
  type ComponentPropsWithoutRef,
} from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { useCategories } from '../../../hooks/useCategories';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button';
import { InitialFocus } from '../../common/InitialFocus';
import { Input } from '../../common/Input';
import { View } from '../../common/View';
import { NamespaceContext } from '../../spreadsheet/NamespaceContext';
import { Tooltip } from '../../tooltips';
import { addToBeBudgetedGroup } from '../util';

type TransferTooltipProps = ComponentPropsWithoutRef<typeof Tooltip> & {
  initialAmount?: number;
  initialAmountName?: string;
  showToBeBudgeted?: boolean;
  onSubmit: (amount: number, category: unknown) => void;
};
export function TransferTooltip({
  initialAmount,
  initialAmountName,
  showToBeBudgeted,
  onSubmit,
  onClose,
  position = 'bottom-right',
  ...props
}: TransferTooltipProps) {
  const spreadsheet = useSpreadsheet();
  const sheetName = useContext(NamespaceContext);
  let { grouped: categoryGroups } = useCategories();

  categoryGroups = categoryGroups.filter(g => !g.is_income);
  if (showToBeBudgeted) {
    categoryGroups = addToBeBudgetedGroup(categoryGroups);
  }

  const [amount, setAmount] = useState(null);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    (async () => {
      if (initialAmountName) {
        const node = await spreadsheet.get(sheetName, initialAmountName);
        setAmount(integerToCurrency(Math.max(node.value as number, 0)));
      } else {
        setAmount(integerToCurrency(Math.max(initialAmount, 0)));
      }
    })();
  }, []);

  function submit() {
    const parsedAmount = evalArithmetic(amount, null);
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
      position={position}
      width={200}
      style={{ padding: 10 }}
      onClose={onClose}
      {...props}
    >
      <View style={{ marginBottom: 5 }}>Transfer this amount:</View>
      <View>
        <InitialFocus>
          <Input
            value={amount}
            onChange={e => setAmount(e.target['value'])}
            onEnter={submit}
          />
        </InitialFocus>
      </View>
      <View style={{ margin: '10px 0 5px 0' }}>To:</View>

      <CategoryAutocomplete
        categoryGroups={categoryGroups}
        value={null}
        openOnFocus={true}
        onUpdate={() => {}}
        onSelect={id => setCategory(id)}
        inputProps={{ onEnter: submit, placeholder: '(none)' }}
      />

      <View
        style={{
          alignItems: 'flex-end',
          marginTop: 10,
        }}
      >
        <Button
          type="primary"
          style={{
            fontSize: 12,
            paddingTop: 3,
            paddingBottom: 3,
          }}
          onClick={submit}
        >
          Transfer
        </Button>
      </View>
    </Tooltip>
  );
}
