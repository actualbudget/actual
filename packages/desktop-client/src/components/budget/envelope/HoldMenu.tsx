import React, {
  useState,
  useContext,
  useEffect,
  type ChangeEvent,
} from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { Button } from '../../common/Button2';
import { InitialFocus } from '../../common/InitialFocus';
import { Input } from '../../common/Input';
import { View } from '../../common/View';
import { NamespaceContext } from '../../spreadsheet/NamespaceContext';

type HoldMenuProps = {
  onSubmit: (amount: number) => void;
  onClose: () => void;
};
export function HoldMenu({ onSubmit, onClose }: HoldMenuProps) {
  const spreadsheet = useSpreadsheet();
  const sheetName = useContext(NamespaceContext);

  const [amount, setAmount] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const node = await spreadsheet.get(sheetName, 'to-budget');
      setAmount(integerToCurrency(Math.max(node.value as number, 0)));
    })();
  }, []);

  function submit(newAmount: string) {
    const parsedAmount = evalArithmetic(newAmount);
    if (parsedAmount) {
      onSubmit(amountToInteger(parsedAmount));
    }
    onClose();
  }

  if (amount === null) {
    // See `TransferMenu` for more info about this
    return null;
  }

  return (
    <View style={{ padding: 10 }}>
      <View style={{ marginBottom: 5 }}>Hold this amount:</View>
      <View>
        <InitialFocus>
          <Input
            value={amount}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setAmount(e.target.value)
            }
            onEnter={() => submit(amount)}
          />
        </InitialFocus>
      </View>
      <View
        style={{
          alignItems: 'flex-end',
          marginTop: 10,
        }}
      >
        <Button
          variant="primary"
          style={{
            fontSize: 12,
            paddingTop: 3,
            paddingBottom: 3,
          }}
          onPress={() => submit(amount)}
        >
          Hold
        </Button>
      </View>
    </View>
  );
}
