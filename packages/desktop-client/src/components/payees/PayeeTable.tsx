// @ts-strict-ignore
import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type ComponentRef,
} from 'react';

import { View } from '@actual-app/components/view';

import { type PayeeEntity } from 'loot-core/types/models';

import { PayeeTableRow } from './PayeeTableRow';

import { useTableNavigator, Table } from '@desktop-client/components/table';
import { useSelectedItems } from '@desktop-client/hooks/useSelected';

// Table items require an ID to work, it's optional in the loot-core
// model so would need to verify accuracy of that before changing there
type PayeeWithId = PayeeEntity & Required<Pick<PayeeEntity, 'id'>>;

type PayeeTableProps = {
  payees: PayeeWithId[];
  ruleCounts: Map<PayeeWithId['id'], number>;
} & Pick<
  ComponentProps<typeof PayeeTableRow>,
  'onUpdate' | 'onDelete' | 'onViewRules' | 'onCreateRule'
>;

export const PayeeTable = forwardRef<
  ComponentRef<typeof Table<PayeeWithId>>,
  PayeeTableProps
>(
  (
    { payees, ruleCounts, onUpdate, onDelete, onViewRules, onCreateRule },
    ref,
  ) => {
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

    const tableNavigator = useTableNavigator(payees, item =>
      item.transfer_acct == null
        ? ['select', 'name', 'rule-count']
        : ['rule-count'],
    );

    return (
      <View style={{ flex: 1 }} onMouseLeave={() => setHovered(null)}>
        <Table
          navigator={tableNavigator}
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
                onDelete={onDelete}
                onViewRules={onViewRules}
                onCreateRule={onCreateRule}
              />
            );
          }}
        />
      </View>
    );
  },
);

PayeeTable.displayName = 'PayeeTable';
