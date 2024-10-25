// @ts-strict-ignore
import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type ComponentRef,
} from 'react';

import { type PayeeEntity } from 'loot-core/src/types/models';

import { useSelectedItems } from '../../hooks/useSelected';
import { View } from '../common/View';
import { type Table, TableResizable } from '../table';

import { PayeeTableRow } from './PayeeTableRow';

// Table items require an ID to work, it's optional in the loot-core
// model so would need to verify accuracy of that before changing there
type PayeeWithId = PayeeEntity & Required<Pick<PayeeEntity, 'id'>>;

type PayeeTableProps = {
  payees: PayeeWithId[];
  ruleCounts: Map<PayeeWithId['id'], number>;
} & Pick<
  ComponentProps<typeof PayeeTableRow>,
  'onUpdate' | 'onViewRules' | 'onCreateRule'
>;

export const PayeeTable = forwardRef<
  ComponentRef<typeof Table<PayeeWithId>>,
  PayeeTableProps
>(({ payees, ruleCounts, onUpdate, onViewRules, onCreateRule }, ref) => {
  const [hovered, setHovered] = useState(null);
  const selectedItems = useSelectedItems();

  useLayoutEffect(() => {
    const firstSelected = [...selectedItems][0] as string;
    if (typeof ref !== 'function') {
      ref.current.scrollTo(firstSelected, 'center');
    }
  }, []);

  const onHover = useCallback(id => {
    setHovered(id);
  }, []);

  return (
    <View style={{ flex: 1 }} onMouseLeave={() => setHovered(null)}>
      <TableResizable
        prefName="payee-table-column-sizes"
        ref={ref}
        items={payees}
        renderItem={({ item, editing, focusedField, onEdit }) => {
          return (
            <PayeeTableRow
              payee={item}
              ruleCount={ruleCounts.get(item.id) || 0}
              selected={selectedItems.has(item.id)}
              editing={editing}
              focusedField={focusedField}
              hovered={hovered === item.id}
              onHover={onHover}
              onEdit={onEdit}
              onUpdate={onUpdate}
              onViewRules={onViewRules}
              onCreateRule={onCreateRule}
            />
          );
        }}
      />
    </View>
  );
});

PayeeTable.displayName = 'PayeeTable';
