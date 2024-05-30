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
import { Table, type TableNavigator } from '../table';

import { PayeeTableRow } from './PayeeTableRow';
import { useCommonPayees } from '../../hooks/usePayees';

// Table items require an ID to work, it's optional in the loot-core
// model so would need to verify accuracy of that before changing there
type PayeeWithId = PayeeEntity & Required<Pick<PayeeEntity, 'id'>>;

type PayeeTableProps = {
  payees: PayeeWithId[];
  ruleCounts: Map<PayeeWithId['id'], number>;
  navigator: TableNavigator<PayeeWithId>;
} & Pick<
  ComponentProps<typeof PayeeTableRow>,
  'onUpdate' | 'onViewRules' | 'onCreateRule'
>;

export const PayeeTable = forwardRef<
  ComponentRef<typeof Table<PayeeWithId>>,
  PayeeTableProps
>(
  (
    { payees, ruleCounts, navigator, onUpdate, onViewRules, onCreateRule },
    ref,
  ) => {
    const [hovered, setHovered] = useState(null);
    const selectedItems = useSelectedItems();
    const commonPayees = useCommonPayees();

    useLayoutEffect(() => {
      const firstSelected = [...selectedItems][0] as string;
      if (typeof ref !== 'function') {
        ref.current.scrollTo(firstSelected, 'center');
      }
      navigator.onEdit(firstSelected, 'select');
    }, []);

    const onHover = useCallback(id => {
      setHovered(id);
    }, []);

    return (
      <View style={{ flex: 1 }} onMouseLeave={() => setHovered(null)}>
        <Table
          ref={ref}
          items={payees}
          navigator={navigator}
          renderItem={({ item, editing, focusedField, onEdit }) => {
            return (
              <PayeeTableRow
                payee={item}
                isCommon={commonPayees.find(cp => cp.id === item.id)}
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
  },
);

PayeeTable.displayName = 'PayeeTable';
