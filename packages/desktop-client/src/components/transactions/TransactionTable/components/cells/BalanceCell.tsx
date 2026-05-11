import { useMemo } from 'react';

import { styles } from '@actual-app/components/styles';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { Cell } from '#components/table';
import { useFormat } from '#hooks/useFormat';

type BalanceCellProps = {
  id: TransactionEntity['id'];
  balance: IntegerAmount | null;
  width: number | 'flex';
  hideFraction: boolean;
};

export function BalanceCell({ balance, width }: BalanceCellProps) {
  const format = useFormat();

  const displayValue = useMemo(() => {
    if (balance == null) return '';
    return format(balance, 'financial');
  }, [balance, format]);

  return (
    <Cell
      name="balance"
      width={width}
      textAlign="right"
      plain
      value={displayValue}
      valueStyle={styles.tnum}
      style={{ marginRight: -5 }}
    />
  );
}
