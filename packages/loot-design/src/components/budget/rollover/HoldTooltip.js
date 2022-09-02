import React, { useState, useContext, useEffect } from 'react';

import evalArithmetic from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { View, Button, Tooltip, InitialFocus, Input } from '../../common';
import NamespaceContext from '../../spreadsheet/NamespaceContext';
import SpreadsheetContext from '../../spreadsheet/SpreadsheetContext';

export default function HoldTooltip({ onSubmit, onClose }) {
  const spreadsheet = useContext(SpreadsheetContext);
  const sheetName = useContext(NamespaceContext);

  const [amount, setAmount] = useState(null);

  useEffect(() => {
    (async () => {
      const node = await spreadsheet.get(sheetName, 'to-budget');
      setAmount(integerToCurrency(Math.max(node.value, 0)));
    })();
  }, []);

  function submit() {
    const parsedAmount = evalArithmetic(amount, null);
    if (parsedAmount) {
      onSubmit(amountToInteger(parsedAmount));
    }
    onClose();
  }

  if (amount === null) {
    // See `TransferTooltip` for more info about this
    return null;
  }

  return (
    <Tooltip
      position="bottom-right"
      width={200}
      style={{ padding: 10 }}
      onClose={onClose}
    >
      <View style={{ marginBottom: 5 }}>Hold this amount:</View>
      <View>
        <InitialFocus>
          <Input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onEnter={submit}
          />
        </InitialFocus>
      </View>
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
          Hold
        </Button>
      </View>
    </Tooltip>
  );
}
