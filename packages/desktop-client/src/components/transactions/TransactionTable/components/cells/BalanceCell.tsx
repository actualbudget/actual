import { useMemo } from 'react';

import { styles } from '@actual-app/components/styles';

import type { IntegerAmount } from 'loot-core/shared/util';
import type { TransactionEntity } from 'loot-core/types/models';

import { Cell } from '@desktop-client/components/table';
import { useFormat } from '@desktop-client/hooks/useFormat';

type BalanceCellProps = {
  id: TransactionEntity['id'];
  balance: IntegerAmount | null;
  hideFraction: boolean;
};

export function BalanceCell({
  balance,
  hideFraction,
}: BalanceCellProps) {
  const format = useFormat();

  const displayValue = useMemo(() => {
    if (balance == null) return '';
    return format(balance, 'financial');
  }, [balance, format]);

  return (
    <Cell
      name="balance"
      width={103}
      textAlign="right"
      plain
      value={displayValue}
      valueStyle={styles.tnum}
      style={{ marginRight: -5 }}
    />
  );
}
