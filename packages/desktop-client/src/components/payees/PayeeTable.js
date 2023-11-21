import { forwardRef, useState, useLayoutEffect, useCallback } from 'react';

import { useSelectedItems } from '../../hooks/useSelected';
import View from '../common/View';
import { Table } from '../table';

import PayeeTableRow from './PayeeTableRow';

const PayeeTable = forwardRef(
  (
    {
      payees,
      ruleCounts,
      navigator,
      categoryGroups,
      highlightedRows,
      ruleActions,
      onUpdate,
      onViewRules,
      onCreateRule,
    },
    ref,
  ) => {
    let [hovered, setHovered] = useState(null);
    let selectedItems = useSelectedItems();

    useLayoutEffect(() => {
      let firstSelected = [...selectedItems][0];
      ref.current.scrollTo(firstSelected, 'center');
      navigator.onEdit(firstSelected, 'select');
    }, []);

    let onHover = useCallback(id => {
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
                ruleCount={ruleCounts.get(item.id) || 0}
                categoryGroups={categoryGroups}
                selected={selectedItems.has(item.id)}
                highlighted={highlightedRows && highlightedRows.has(item.id)}
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

export default PayeeTable;
