import {
  forwardRef,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  useImperativeHandle,
} from 'react';

import memoizeOne from 'memoize-one';

import { groupById } from 'loot-core/src/shared/util';

import useSelected, {
  SelectedProvider,
  useSelectedItems,
  useSelectedDispatch,
} from '../../hooks/useSelected';
import useStableCallback from '../../hooks/useStableCallback';
import Delete from '../../icons/v0/Delete';
import ExpandArrow from '../../icons/v0/ExpandArrow';
import Merge from '../../icons/v0/Merge';
import { theme } from '../../style';
import Button from '../common/Button';
import Menu from '../common/Menu';
import Search from '../common/Search';
import View from '../common/View';
import {
  Table,
  TableHeader,
  Cell,
  SelectCell,
  useTableNavigator,
} from '../table';
import { Tooltip } from '../tooltips';

import PayeeTableRow from './PayeeTableRow';

let getPayeesById = memoizeOne(payees => groupById(payees));

function plural(count, singleText, pluralText) {
  return count === 1 ? singleText : pluralText;
}

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

function PayeeTableHeader() {
  let borderColor = theme.tableborder;
  let dispatchSelected = useSelectedDispatch();
  let selectedItems = useSelectedItems();

  return (
    <View>
      <TableHeader
        style={{
          borderColor,
          backgroundColor: theme.tableBackground,
          color: theme.pageTextLight,
          zIndex: 200,
          userSelect: 'none',
        }}
        collapsed={true}
      >
        <SelectCell
          exposed={true}
          focused={false}
          selected={selectedItems.size > 0}
          onSelect={e => dispatchSelected({ type: 'select-all', event: e })}
        />
        <Cell value="Name" width="flex" />
      </TableHeader>
    </View>
  );
}

function EmptyMessage({ text, style }) {
  return (
    <View
      style={{
        textAlign: 'center',
        color: theme.pageTextSubdued,
        fontStyle: 'italic',
        fontSize: 13,
        marginTop: 5,
        style,
      }}
    >
      {text}
    </View>
  );
}

function PayeeMenu({ payeesById, selectedPayees, onDelete, onMerge, onClose }) {
  // Transfer accounts are never editable
  let isDisabled = [...selectedPayees].some(
    id => payeesById[id] == null || payeesById[id].transfer_acct,
  );

  return (
    <Tooltip
      position="bottom"
      width={250}
      style={{ padding: 0 }}
      onClose={onClose}
    >
      <Menu
        onMenuSelect={type => {
          onClose();
          switch (type) {
            case 'delete':
              onDelete();
              break;
            case 'merge':
              onMerge();
              break;
            default:
          }
        }}
        footer={
          <View
            style={{
              padding: 3,
              fontSize: 11,
              fontStyle: 'italic',
              color: theme.pageTextSubdued,
            }}
          >
            {[...selectedPayees]
              .slice(0, 4)
              .map(id => payeesById[id].name)
              .join(', ') + (selectedPayees.size > 4 ? ', and more' : '')}
          </View>
        }
        items={[
          {
            icon: Delete,
            name: 'delete',
            text: 'Delete',
            disabled: isDisabled,
          },
          {
            icon: Merge,
            iconSize: 9,
            name: 'merge',
            text: 'Merge',
            disabled: isDisabled || selectedPayees.size < 2,
          },
          Menu.line,
        ]}
      />
    </Tooltip>
  );
}

export const ManagePayees = forwardRef(
  (
    {
      payees,
      ruleCounts,
      orphanedPayees,
      categoryGroups,
      initialSelectedIds,
      ruleActions,
      onBatchChange,
      onViewRules,
      onCreateRule,
      ...props
    },
    ref,
  ) => {
    let [highlightedRows, setHighlightedRows] = useState(null);
    let [filter, setFilter] = useState('');
    let table = useRef(null);
    let scrollTo = useRef(null);
    let resetAnimation = useRef(false);
    const [orphanedOnly, setOrphanedOnly] = useState(false);

    let filteredPayees = useMemo(() => {
      let filtered = payees;
      if (filter) {
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(filter.toLowerCase()),
        );
      }
      if (orphanedOnly) {
        filtered = filtered.filter(p =>
          orphanedPayees.map(o => o.id).includes(p.id),
        );
      }
      return filtered;
    }, [payees, filter, orphanedOnly]);

    let selected = useSelected('payees', filteredPayees, initialSelectedIds);

    function applyFilter(f) {
      if (filter !== f) {
        table.current?.setRowAnimation(false);
        setFilter(f);
        resetAnimation.current = true;
      }
    }

    function _scrollTo(id) {
      applyFilter('');
      scrollTo.current = id;
    }

    useEffect(() => {
      if (resetAnimation.current) {
        // Very annoying, for some reason it's as if the table doesn't
        // actually update its contents until the next tick or
        // something? The table keeps being animated without this
        setTimeout(() => {
          table.current?.setRowAnimation(true);
        }, 0);
        resetAnimation.current = false;
      }
    });

    useImperativeHandle(ref, () => ({
      selectRows: (ids, scroll) => {
        tableNavigator.onEdit(null);
        selected.dispatch({ type: 'select-all', ids });
        setHighlightedRows(null);

        if (scroll && ids.length > 0) {
          _scrollTo(ids[0]);
        }
      },

      highlightRow: id => {
        tableNavigator.onEdit(null);
        setHighlightedRows(new Set([id]));
        _scrollTo(id);
      },
    }));

    // `highlightedRows` should only ever be true once, and we
    // immediately discard it. This triggers an animation.
    useEffect(() => {
      if (highlightedRows) {
        setHighlightedRows(null);
      }
    }, [highlightedRows]);

    useLayoutEffect(() => {
      if (scrollTo.current) {
        table.current.scrollTo(scrollTo.current);
        scrollTo.current = null;
      }
    });

    let onUpdate = useStableCallback((id, name, value) => {
      let payee = payees.find(p => p.id === id);
      if (payee[name] !== value) {
        onBatchChange({ updated: [{ id, [name]: value }] });
      }
    });

    let getSelectableIds = useCallback(() => {
      return filteredPayees.filter(p => p.transfer_acct == null).map(p => p.id);
    }, [filteredPayees]);

    function onDelete() {
      onBatchChange({ deleted: [...selected.items].map(id => ({ id })) });
      selected.dispatch({ type: 'select-none' });
    }

    async function onMerge() {
      let ids = [...selected.items];
      await props.onMerge(ids);

      tableNavigator.onEdit(ids[0], 'name');
      selected.dispatch({ type: 'select-none' });
      _scrollTo(ids[0]);
    }

    let buttonsDisabled = selected.items.size === 0;

    let tableNavigator = useTableNavigator(filteredPayees, item =>
      ['select', 'name', 'rule-count'].filter(name => {
        switch (name) {
          case 'select':
            return item.transfer_acct == null;
          default:
            return true;
        }
      }),
    );

    let payeesById = getPayeesById(payees);

    let [menuOpen, setMenuOpen] = useState(false);

    return (
      <View style={{ height: '100%' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: '0 0 15px',
          }}
        >
          <View style={{ flexShrink: 0 }}>
            <Button
              type="bare"
              style={{ marginRight: 10 }}
              disabled={buttonsDisabled}
              onClick={() => setMenuOpen(true)}
            >
              {buttonsDisabled
                ? 'No payees selected'
                : selected.items.size +
                  ' ' +
                  plural(selected.items.size, 'payee', 'payees')}
              <ExpandArrow width={8} height={8} style={{ marginLeft: 5 }} />
            </Button>
            {menuOpen && (
              <PayeeMenu
                payeesById={payeesById}
                selectedPayees={selected.items}
                onClose={() => setMenuOpen(false)}
                onDelete={onDelete}
                onMerge={onMerge}
              />
            )}
          </View>
          <View
            style={{
              flexShrink: 0,
            }}
          >
            {(orphanedOnly ||
              (orphanedPayees && orphanedPayees.length > 0)) && (
              <Button
                type="bare"
                style={{ marginRight: 10 }}
                onClick={() => {
                  setOrphanedOnly(!orphanedOnly);
                  applyFilter(filter);
                  tableNavigator.onEdit(null);
                }}
              >
                {orphanedOnly
                  ? 'Show all payees'
                  : `Show ${
                      orphanedPayees.length === 1
                        ? '1 unused payee'
                        : `${orphanedPayees.length} unused payees`
                    }`}
              </Button>
            )}
          </View>
          <View style={{ flex: 1 }} />
          <Search
            id="filter-input"
            placeholder="Filter payees..."
            value={filter}
            onChange={applyFilter}
          />
        </View>

        <SelectedProvider instance={selected} fetchAllIds={getSelectableIds}>
          <View
            style={{
              flex: 1,
              border: '1px solid ' + theme.tableBorder,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              overflow: 'hidden',
            }}
          >
            <PayeeTableHeader />
            {filteredPayees.length === 0 ? (
              <EmptyMessage text="No payees" style={{ marginTop: 15 }} />
            ) : (
              <PayeeTable
                ref={table}
                payees={filteredPayees}
                ruleCounts={ruleCounts}
                categoryGroups={categoryGroups}
                highlightedRows={highlightedRows}
                navigator={tableNavigator}
                onUpdate={onUpdate}
                onViewRules={onViewRules}
                onCreateRule={onCreateRule}
              />
            )}
          </View>
        </SelectedProvider>
      </View>
    );
  },
);
