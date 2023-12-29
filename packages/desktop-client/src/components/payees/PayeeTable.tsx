import {
  useCallback,
  useLayoutEffect,
  useState,
  type ComponentProps,
} from 'react';

import { type PayeeEntity } from 'loot-core/src/types/models';

import { useSelectedItems } from '../../hooks/useSelected';
import View from '../common/View';
import { Table, type TableNavigator } from '../table';

import PayeeTableRow from './PayeeTableRow';

// Table items require an ID to work, it's optional in the loot-core
// model so would need to verify accuracy of that before changing there
type PayeeWithId = PayeeEntity & Required<Pick<PayeeEntity, 'id'>>;

type PayeeTableProps = {
  tableRef: ComponentProps<typeof Table<PayeeWithId>>['tableRef'];
  payees: PayeeWithId[];
  ruleCounts: Map<PayeeWithId['id'], number>;
  navigator: TableNavigator<PayeeWithId>;
} & Pick<
  ComponentProps<typeof PayeeTableRow>,
  'onUpdate' | 'onViewRules' | 'onCreateRule'
>;

const PayeeTable = ({
  tableRef,
  payees,
  ruleCounts,
  navigator,
  onUpdate,
  onViewRules,
  onCreateRule,
}: PayeeTableProps) => {
  const [hovered, setHovered] = useState(null);
  const selectedItems = useSelectedItems();

  useLayoutEffect(() => {
    const firstSelected = [...selectedItems][0] as string;
    if (typeof tableRef !== 'function') {
      tableRef.current.scrollTo(firstSelected, 'center');
    }
    navigator.onEdit(firstSelected, 'select');
  }, []);

  const onHover = useCallback((id: string) => {
    setHovered(id);
  }, []);

  return (
    <View style={{ flex: 1 }} onMouseLeave={() => setHovered(null)}>
      <Table
        tableRef={tableRef}
        items={payees}
        navigator={navigator}
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
};

export default PayeeTable;
