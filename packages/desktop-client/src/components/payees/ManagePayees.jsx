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

import { getNormalisedString } from 'loot-core/src/shared/normalisation';
import { groupById } from 'loot-core/src/shared/util';

import {
  useSelected,
  SelectedProvider,
  useSelectedDispatch,
  useSelectedItems,
} from '../../hooks/useSelected';
import { useStableCallback } from '../../hooks/useStableCallback';
import { SvgExpandArrow } from '../../icons/v0';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Popover } from '../common/Popover';
import { Search } from '../common/Search';
import { View } from '../common/View';
import { TableHeader, Cell, SelectCell, useTableNavigator } from '../table';

import { PayeeMenu } from './PayeeMenu';
import { PayeeTable } from './PayeeTable';

const getPayeesById = memoizeOne(payees => groupById(payees));

function plural(count, singleText, pluralText) {
  return count === 1 ? singleText : pluralText;
}

function PayeeTableHeader() {
  const borderColor = theme.tableborder;
  const dispatchSelected = useSelectedDispatch();
  const selectedItems = useSelectedItems();

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
          onSelect={e =>
            dispatchSelected({ type: 'select-all', isRangeSelect: e.shiftKey })
          }
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
    const [highlightedRows, setHighlightedRows] = useState(null);
    const [filter, setFilter] = useState('');
    const table = useRef(null);
    const scrollTo = useRef(null);
    const triggerRef = useRef(null);
    const resetAnimation = useRef(false);
    const [orphanedOnly, setOrphanedOnly] = useState(false);

    const filteredPayees = useMemo(() => {
      let filtered = payees;
      if (filter) {
        filtered = filtered.filter(p =>
          getNormalisedString(p.name).includes(getNormalisedString(filter)),
        );
      }
      if (orphanedOnly) {
        filtered = filtered.filter(p =>
          orphanedPayees.map(o => o.id).includes(p.id),
        );
      }
      return filtered;
    }, [payees, filter, orphanedOnly]);

    const selected = useSelected('payees', filteredPayees, initialSelectedIds);

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

    const onUpdate = useStableCallback((id, name, value) => {
      const payee = payees.find(p => p.id === id);
      if (payee[name] !== value) {
        onBatchChange({ updated: [{ id, [name]: value }] });
      }
    });

    const getSelectableIds = useCallback(() => {
      return filteredPayees.filter(p => p.transfer_acct == null).map(p => p.id);
    }, [filteredPayees]);

    function onDelete() {
      onBatchChange({ deleted: [...selected.items].map(id => ({ id })) });
      selected.dispatch({ type: 'select-none' });
    }

    function onFavorite() {
      const allFavorited = [...selected.items]
        .map(id => payeesById[id].favorite)
        .every(f => f === 1);
      if (allFavorited) {
        onBatchChange({
          updated: [...selected.items].map(id => ({ id, favorite: 0 })),
        });
      } else {
        onBatchChange({
          updated: [...selected.items].map(id => ({ id, favorite: 1 })),
        });
      }
      selected.dispatch({ type: 'select-none' });
    }

    async function onMerge() {
      const ids = [...selected.items];
      await props.onMerge(ids);

      tableNavigator.onEdit(ids[0], 'name');
      selected.dispatch({ type: 'select-none' });
      _scrollTo(ids[0]);
    }

    const buttonsDisabled = selected.items.size === 0;

    const tableNavigator = useTableNavigator(filteredPayees, item =>
      ['select', 'name', 'rule-count'].filter(name => {
        switch (name) {
          case 'select':
            return item.transfer_acct == null;
          default:
            return true;
        }
      }),
    );

    const payeesById = getPayeesById(payees);

    const [menuOpen, setMenuOpen] = useState(false);

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
              ref={triggerRef}
              variant="bare"
              style={{ marginRight: 10 }}
              isDisabled={buttonsDisabled}
              onPress={() => setMenuOpen(true)}
            >
              {buttonsDisabled
                ? 'No payees selected'
                : selected.items.size +
                  ' ' +
                  plural(selected.items.size, 'payee', 'payees')}
              <SvgExpandArrow width={8} height={8} style={{ marginLeft: 5 }} />
            </Button>

            <Popover
              triggerRef={triggerRef}
              isOpen={menuOpen}
              placement="bottom start"
              style={{ width: 250 }}
              onOpenChange={() => setMenuOpen(false)}
            >
              <PayeeMenu
                payeesById={payeesById}
                selectedPayees={selected.items}
                onClose={() => setMenuOpen(false)}
                onDelete={onDelete}
                onMerge={onMerge}
                onFavorite={onFavorite}
              />
            </Popover>
          </View>
          <View
            style={{
              flexShrink: 0,
            }}
          >
            {(orphanedOnly ||
              (orphanedPayees && orphanedPayees.length > 0)) && (
              <Button
                variant="bare"
                style={{ marginRight: 10 }}
                onPress={() => {
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

ManagePayees.displayName = 'ManagePayees';
