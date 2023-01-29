import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  useImperativeHandle
} from 'react';

import Component from '@reactions/component';
import memoizeOne from 'memoize-one';

import { groupById } from 'loot-core/src/shared/util';

import { colors } from '../style';
import Delete from '../svg/v0/Delete';
import ExpandArrow from '../svg/v0/ExpandArrow';
import Merge from '../svg/v0/Merge';
import ArrowThinRight from '../svg/v1/ArrowThinRight';

import {
  useStableCallback,
  View,
  Text,
  Input,
  Button,
  Tooltip,
  Menu
} from './common';
import {
  Table,
  TableHeader,
  Row,
  Cell,
  InputCell,
  SelectCell,
  CellButton,
  useTableNavigator
} from './table';
import useSelected, {
  SelectedProvider,
  useSelectedItems,
  useSelectedDispatch
} from './useSelected';

let getPayeesById = memoizeOne(payees => groupById(payees));

function plural(count, singleText, pluralText) {
  return count === 1 ? singleText : pluralText;
}

function RuleButton({ ruleCount, focused, onEdit, onClick }) {
  return (
    <Cell
      name="rule-count"
      width="auto"
      focused={focused}
      style={{ padding: '0 10px' }}
      plain
    >
      <CellButton
        style={{
          borderRadius: 4,
          padding: '3px 6px',
          backgroundColor: colors.g9,
          border: '1px solid ' + colors.g9,
          color: colors.g1,
          fontSize: 12
        }}
        onEdit={onEdit}
        onSelect={onClick}
        onFocus={onEdit}
      >
        <Text style={{ paddingRight: 5 }}>
          {ruleCount > 0 ? (
            <>
              {ruleCount} associated {plural(ruleCount, 'rule', 'rules')}
            </>
          ) : (
            <>Create rule</>
          )}
        </Text>
        <ArrowThinRight style={{ width: 8, height: 8, color: colors.g1 }} />
      </CellButton>
    </Cell>
  );
}

let Payee = React.memo(
  ({
    style,
    payee,
    ruleCount,
    categoryGroups,
    selected,
    highlighted,
    hovered,
    editing,
    focusedField,
    onViewRules,
    onCreateRule,
    onHover,
    onEdit,
    onUpdate,
    ruleActions
  }) => {
    let { id } = payee;
    let dispatchSelected = useSelectedDispatch();
    let borderColor = selected ? colors.b8 : colors.border;
    let backgroundFocus = hovered || focusedField === 'select';

    return (
      <Row
        borderColor={borderColor}
        backgroundColor={
          selected ? colors.b9 : backgroundFocus ? colors.hover : 'white'
        }
        highlighted={highlighted}
        style={[
          { alignItems: 'stretch' },
          style,
          {
            backgroundColor: hovered ? colors.hover : null
          },
          selected && {
            backgroundColor: colors.b9,
            zIndex: 100
          }
        ]}
        data-focus-key={payee.id}
        onMouseEnter={() => onHover && onHover(payee.id)}
      >
        <SelectCell
          exposed={
            payee.transfer_acct == null && (hovered || selected || editing)
          }
          focused={focusedField === 'select'}
          selected={selected}
          onSelect={() => {
            dispatchSelected({ type: 'select', id: payee.id });
          }}
        />
        <InputCell
          value={(payee.transfer_acct ? 'Transfer: ' : '') + payee.name}
          valueStyle={!selected && payee.transfer_acct && { color: colors.n7 }}
          exposed={focusedField === 'name'}
          width="flex"
          onUpdate={value =>
            !payee.transfer_acct && onUpdate(id, 'name', value)
          }
          onExpose={() => onEdit(id, 'name')}
          inputProps={{ readOnly: !!payee.transfer_acct }}
        />
        <RuleButton
          ruleCount={ruleCount}
          focused={focusedField === 'rule-count'}
          onEdit={() => onEdit(id, 'rule-count')}
          onClick={() =>
            ruleCount > 0 ? onViewRules(payee.id) : onCreateRule(payee.id)
          }
        />
      </Row>
    );
  }
);

const PayeeTable = React.forwardRef(
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
      onCreateRule
    },
    ref
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
      <View style={[{ flex: 1 }]} onMouseLeave={() => setHovered(null)}>
        <Table
          ref={ref}
          items={payees}
          navigator={navigator}
          renderItem={({ item, editing, focusedField, onEdit }) => {
            return (
              <Payee
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
  }
);

function PayeeTableHeader() {
  let borderColor = colors.border;
  let dispatchSelected = useSelectedDispatch();
  let selectedItems = useSelectedItems();

  return (
    <View>
      <TableHeader
        borderColor={borderColor}
        style={{
          backgroundColor: 'white',
          color: colors.n4,
          zIndex: 200,
          userSelect: 'none'
        }}
        collapsed={true}
        version="v2"
      >
        <SelectCell
          exposed={true}
          focused={false}
          selected={selectedItems.size > 0}
          onSelect={() => dispatchSelected({ type: 'select-all' })}
        />
        <Cell value="Name" width="flex" />
      </TableHeader>
    </View>
  );
}

function EmptyMessage({ text, style }) {
  return (
    <View
      style={[
        {
          textAlign: 'center',
          color: colors.n7,
          fontStyle: 'italic',
          fontSize: 13,
          marginTop: 5
        },
        style
      ]}
    >
      {text}
    </View>
  );
}

function PayeeMenu({ payeesById, selectedPayees, onDelete, onMerge, onClose }) {
  // Transfer accounts are never editable
  let isDisabled = [...selectedPayees].some(
    id => payeesById[id] == null || payeesById[id].transfer_acct
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
              color: colors.n7
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
            disabled: isDisabled
          },
          {
            icon: Merge,
            iconSize: 9,
            name: 'merge',
            text: 'Merge',
            disabled: isDisabled || selectedPayees.size < 2
          },
          Menu.line
        ]}
      />
    </Tooltip>
  );
}

export const ManagePayees = React.forwardRef(
  (
    {
      modalProps,
      payees,
      ruleCounts,
      categoryGroups,
      tableNavigatorOpts,
      initialSelectedIds,
      ruleActions,
      onBatchChange,
      onViewRules,
      onCreateRule,
      ...props
    },
    ref
  ) => {
    let [highlightedRows, setHighlightedRows] = useState(null);
    let [filter, setFilter] = useState('');
    let table = useRef(null);
    let scrollTo = useRef(null);
    let resetAnimation = useRef(false);

    let filteredPayees = useMemo(
      () =>
        filter === ''
          ? payees
          : payees.filter(p =>
              p.name.toLowerCase().includes(filter.toLowerCase())
            ),
      [payees, filter]
    );

    let selected = useSelected('payees', filteredPayees, initialSelectedIds);

    function applyFilter(f) {
      if (filter !== f) {
        table.current && table.current.setRowAnimation(false);
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
          table.current && table.current.setRowAnimation(true);
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
      }
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

    let tableNavigator = useTableNavigator(
      filteredPayees,
      item =>
        ['select', 'name', 'rule-count'].filter(name => {
          switch (name) {
            case 'select':
              return item.transfer_acct == null;
            default:
              return true;
          }
        }),
      tableNavigatorOpts
    );

    let payeesById = getPayeesById(payees);

    return (
      <View style={{ height: '100%' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: '0 10px 5px'
          }}
        >
          <Component initialState={{ menuOpen: false }}>
            {({ state, setState }) => (
              <View>
                <Button
                  bare
                  style={{ marginRight: 10 }}
                  disabled={buttonsDisabled}
                  onClick={() => setState({ menuOpen: true })}
                >
                  {buttonsDisabled
                    ? 'No payees selected'
                    : selected.items.size +
                      ' ' +
                      plural(selected.items.size, 'payee', 'payees')}
                  <ExpandArrow width={8} height={8} style={{ marginLeft: 5 }} />
                </Button>
                {state.menuOpen && (
                  <PayeeMenu
                    payeesById={payeesById}
                    selectedPayees={selected.items}
                    onClose={() => setState({ menuOpen: false })}
                    onDelete={onDelete}
                    onMerge={onMerge}
                  />
                )}
              </View>
            )}
          </Component>
          <View style={{ flex: 1 }} />
          <Input
            placeholder="Filter payees..."
            value={filter}
            onChange={e => {
              applyFilter(e.target.value);
              tableNavigator.onEdit(null);
            }}
            style={{
              width: 350,
              borderColor: 'transparent',
              backgroundColor: colors.n11,
              ':focus': {
                backgroundColor: 'white',
                '::placeholder': { color: colors.n8 }
              }
            }}
          />
        </View>

        <SelectedProvider instance={selected} fetchAllIds={getSelectableIds}>
          <View
            style={{
              flex: 1,
              border: '1px solid ' + colors.border,
              borderRadius: 4,
              overflow: 'hidden'
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
  }
);
