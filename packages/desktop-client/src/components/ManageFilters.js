import React, {
  forwardRef,
  memo,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { format as formatDate, parseISO } from 'date-fns';
import { css } from 'glamor';

import { pushModal } from 'loot-core/src/client/actions/modals';
import { initiallyLoadPayees } from 'loot-core/src/client/actions/queries';
import q from 'loot-core/src/client/query-helpers';
import { liveQueryContext } from 'loot-core/src/client/query-hooks';
//import { getPayeesById } from 'loot-core/src/client/reducers/queries';
import { send } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { getMonthYearFormat } from 'loot-core/src/shared/months';
import { mapField, friendlyOp } from 'loot-core/src/shared/rules';
import { getRecurringDescription } from 'loot-core/src/shared/schedules';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useSelected, {
  useSelectedDispatch,
  useSelectedItems,
  SelectedProvider,
} from '../hooks/useSelected';
import { colors } from '../style';

import { View, Text, Button, Stack, Input } from './common';
import {
  SelectCell,
  Row,
  Field,
  Cell,
  CellButton,
  TableHeader,
  useTableNavigator,
} from './table';

let SchedulesQuery = liveQueryContext(q('schedules').select('*'));

export function Value({
  value,
  field,
  inline = false,
  data: dataProp,
  describe = x => x.name,
}) {
  let { data, dateFormat } = useSelector(state => {
    let data;
    if (dataProp) {
      data = dataProp;
    } else {
      switch (field) {
        case 'payee':
          data = state.queries.payees;
          break;
        case 'category':
          data = state.queries.categories.list;
          break;
        case 'account':
          data = state.queries.accounts;
          break;
        default:
          data = [];
      }
    }

    return {
      data,
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    };
  });
  let [expanded, setExpanded] = useState(false);

  function onExpand(e) {
    e.preventDefault();
    setExpanded(true);
  }

  function formatValue(value) {
    if (value == null || value === '') {
      return '(nothing)';
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else {
      if (field === 'amount') {
        return integerToCurrency(value);
      } else if (field === 'date') {
        if (value) {
          if (value.frequency) {
            return getRecurringDescription(value);
          }
          return formatDate(parseISO(value), dateFormat);
        }
        return null;
      } else if (field === 'month') {
        return value
          ? formatDate(parseISO(value), getMonthYearFormat(dateFormat))
          : null;
      } else if (field === 'year') {
        return value ? formatDate(parseISO(value), 'yyyy') : null;
      } else if (field === 'notes') {
        return value;
      } else {
        if (data && data.length) {
          let item = data.find(item => item.id === value);
          if (item) {
            return describe(item);
          } else {
            return '(deleted)';
          }
        } else {
          return '…';
        }
      }
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Text style={{ color: colors.p4 }}>(empty)</Text>;
    } else if (value.length === 1) {
      return (
        <Text>
          [<Text style={{ color: colors.p4 }}>{formatValue(value[0])}</Text>]
        </Text>
      );
    }

    let displayed = value;
    if (!expanded && value.length > 4) {
      displayed = value.slice(0, 3);
    }
    let numHidden = value.length - displayed.length;
    return (
      <Text style={{ color: colors.n3 }}>
        [
        {displayed.map((v, i) => {
          let text = <Text style={{ color: colors.p4 }}>{formatValue(v)}</Text>;
          let spacing;
          if (inline) {
            spacing = i !== 0 ? ' ' : '';
          } else {
            spacing = (
              <>
                {i === 0 && <br />}
                &nbsp;&nbsp;
              </>
            );
          }

          return (
            <Text key={i}>
              {spacing}
              {text}
              {i === value.length - 1 ? '' : ','}
              {!inline && <br />}
            </Text>
          );
        })}
        {numHidden > 0 && (
          <Text style={{ color: colors.p4 }}>
            &nbsp;&nbsp;
            {/* eslint-disable-next-line */}
                <a
              href="#"
              onClick={onExpand}
              {...css({
                color: colors.p4,
                textDecoration: 'none',
                ':hover': { textDecoration: 'underline' },
              })}
            >
              {numHidden} more items...
            </a>
            {!inline && <br />}
          </Text>
        )}
        ]
      </Text>
    );
  } else if (value && value.num1 != null && value.num2 != null) {
    // An "in between" type
    return (
      <Text>
        <Text style={{ color: colors.p4 }}>{formatValue(value.num1)}</Text> and{' '}
        <Text style={{ color: colors.p4 }}>{formatValue(value.num2)}</Text>
      </Text>
    );
  } else {
    return <Text style={{ color: colors.p4 }}>{formatValue(value)}</Text>;
  }
}

export function ConditionExpression({
  field,
  op,
  value,
  options,
  stage,
  style,
}) {
  return (
    <View
      style={[
        {
          display: 'block',
          maxWidth: '100%',
          backgroundColor: colors.n10,
          borderRadius: 4,
          padding: '3px 5px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        style,
      ]}
    >
      <Text style={{ color: colors.p4 }}>{mapField(field, options)}</Text>{' '}
      <Text style={{ color: colors.n3 }}>{friendlyOp(op)}</Text>{' '}
      <Value value={value} field={field} />
    </View>
  );
}

let Filter = memo(
  ({
    filter,
    hovered,
    selected,
    editing,
    focusedField,
    onHover,
    onEdit,
    onEditFilter,
  }) => {
    let dispatchSelected = useSelectedDispatch();
    let borderColor = selected ? colors.b8 : colors.border;
    let backgroundFocus = hovered || focusedField === 'select';

    return (
      <Row
        height="auto"
        borderColor={borderColor}
        backgroundColor={
          selected ? colors.selected : backgroundFocus ? colors.hover : 'white'
        }
        style={{ fontSize: 13, zIndex: editing || selected ? 101 : 'auto' }}
        collapsed="true"
        onMouseEnter={() => onHover && onHover(filter.id)}
        onMouseLeave={() => onHover && onHover(null)}
      >
        <SelectCell
          exposed={hovered || selected || editing}
          focused={focusedField === 'select'}
          onSelect={() => {
            dispatchSelected({ type: 'select', id: filter.id });
          }}
          onEdit={() => onEdit(filter.id, 'select')}
          selected={selected}
        />

        <Cell name="stage" width={50} plain style={{ color: colors.n5 }}>
          {filter.stage && (
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                backgroundColor: colors.b10,
                color: colors.b1,
                borderRadius: 4,
                padding: '3px 5px',
              }}
            >
              {filter.stage}
            </View>
          )}
        </Cell>

        <Field width="flex" style={{ padding: '15px 0' }} truncate={false}>
          <Stack direction="row" align="center">
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              {filter.conditions.map((cond, i) => (
                <ConditionExpression
                  key={i}
                  field={cond.field}
                  op={cond.op}
                  value={cond.value}
                  options={cond.options}
                  stage={filter.stage}
                  style={i !== 0 && { marginTop: 3 }}
                />
              ))}
            </View>
          </Stack>
        </Field>

        <Cell
          name="edit"
          focused={focusedField === 'edit'}
          plain
          style={{ padding: '0 15px', paddingLeft: 5 }}
        >
          <Button
            as={CellButton}
            onSelect={() => onEditFilter(filter)}
            onEdit={() => onEdit(filter.id, 'edit')}
          >
            Edit
          </Button>
        </Cell>
      </Row>
    );
  },
);

let SimpleTable = forwardRef(
  (
    { data, navigator, loadMore, style, onHoverLeave, children, ...props },
    ref,
  ) => {
    let contentRef = useRef();
    let contentHeight = useRef();
    let scrollRef = useRef();
    let { getNavigatorProps } = navigator;

    function onScroll(e) {
      if (contentHeight.current != null) {
        if (loadMore && e.target.scrollTop > contentHeight.current - 750) {
          loadMore();
        }
      }
    }

    useEffect(() => {
      if (contentRef.current) {
        contentHeight.current =
          contentRef.current.getBoundingClientRect().height;
      } else {
        contentHeight.current = null;
      }
    }, [contentRef.current, data]);

    return (
      <View
        style={[
          {
            flex: 1,
            outline: 'none',
            '& .animated .animated-row': { transition: '.25s transform' },
          },
          style,
        ]}
        tabIndex="1"
        {...getNavigatorProps(props)}
      >
        <View
          innerRef={scrollRef}
          style={{ maxWidth: '100%', overflow: 'auto' }}
          onScroll={onScroll}
        >
          <div ref={contentRef} onMouseLeave={onHoverLeave}>
            {children}
          </div>
        </View>
      </View>
    );
  },
);

function FiltersHeader() {
  let selectedItems = useSelectedItems();
  let dispatchSelected = useSelectedDispatch();

  return (
    <TableHeader version="v2" style={{}}>
      <SelectCell
        exposed={true}
        focused={false}
        selected={selectedItems.size > 0}
        onSelect={() => dispatchSelected({ type: 'select-all' })}
      />
      <Cell value="Filter" width="flex" />
    </TableHeader>
  );
}

function FiltersList({
  filters,
  selectedItems,
  navigator,
  hoveredFilter,
  collapsed: borderCollapsed,
  onHover,
  onCollapse,
  onEditFilter,
}) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <View>
      {filters.map(filter => {
        let hovered = hoveredFilter === filter.id;
        let selected = selectedItems.has(filter.id);
        let editing = navigator.editingId === filter.id;

        return (
          <Filter
            key={filter.id}
            filter={filter}
            hovered={hovered}
            selected={selected}
            editing={editing}
            focusedField={editing && navigator.focusedField}
            onHover={onHover}
            onEdit={navigator.onEdit}
            onEditFilter={onEditFilter}
          />
        );
      })}
    </View>
  );
}

function mapValue(field, value, { payees, categories, accounts }) {
  if (!value) return '';

  let object = null;
  if (field === 'payee') {
    object = payees.find(p => p.id === value);
  } else if (field === 'category') {
    object = categories.find(c => c.id === value);
  } else if (field === 'account') {
    object = accounts.find(a => a.id === value);
  } else {
    return value;
  }
  if (object) {
    return object.name;
  }
  return '(deleted)';
}

function filterToString(filter, data) {
  let conditions = filter.conditions.flatMap(cond => [
    mapField(cond.field),
    friendlyOp(cond.op),
    cond.op === 'oneOf'
      ? cond.value.map(v => mapValue(cond.field, v, data)).join(', ')
      : mapValue(cond.field, cond.value, data),
  ]);
  return (filter.stage || '') + ' ' + conditions.join(' ');
}

function ManageFiltersContent({ isModal, payeeId, setLoading }) {
  let [allFilters, setAllFilters] = useState(null);
  let [filters, setFilters] = useState(null);
  let [filter, setFilter] = useState('');
  let dispatch = useDispatch();
  let navigator = useTableNavigator(filters, ['select', 'edit']);

  let filterData = useSelector(state => ({
    payees: state.queries.payees,
    categories: state.queries.categories.list,
    accounts: state.queries.accounts,
  }));

  let filteredFilters = useMemo(
    () =>
      filter === '' || !filters
        ? filters
        : filters.filter(filter =>
            filterToString(filter, filterData)
              .toLowerCase()
              .includes(filter.toLowerCase()),
          ),
    [filters, filter, filterData],
  );
  let selectedInst = useSelected('manage-filters', allFilters, []);
  let [hoveredFilter, setHoveredFilter] = useState(null);
  let tableRef = useRef(null);

  async function loadFilters() {
    setLoading(true);

    let loadedFilters = await send('rules-get');

    setAllFilters(loadedFilters);
    return loadedFilters;
  }

  useEffect(() => {
    async function loadData() {
      let loadedFilters = await loadFilters();
      setFilters(loadedFilters.slice(0, 100));
      setLoading(false);

      await dispatch(initiallyLoadPayees());
    }

    undo.setUndoState('openModal', 'manage-filters');

    loadData();

    return () => {
      undo.setUndoState('openModal', null);
    };
  }, []);

  function loadMore() {
    setFilters(
      filters.concat(allFilters.slice(filters.length, filters.length + 50)),
    );
  }

  async function onDeleteSelected() {
    setLoading(true);
    let { someDeletionsFailed } = await send('filter-delete-all', [
      ...selectedInst.items,
    ]);

    if (someDeletionsFailed) {
      alert('Some filters were not deleted because ???');
    }

    let newFilters = await loadFilters();
    setFilters(filters => {
      return newFilters.slice(0, filters.length);
    });
    selectedInst.dispatch({ type: 'select-none' });
    setLoading(false);
  }

  let onEditFilter = useCallback(filter => {
    dispatch(
      pushModal('edit-filter', {
        filter,
        onSave: async newFilter => {
          let newFilters = await loadFilters();

          setFilters(filters => {
            let newIdx = newFilters.findIndex(
              filter => filter.id === newFilter.id,
            );

            if (newIdx > filters.length) {
              return newFilters.slice(0, newIdx + 75);
            } else {
              return newFilters.slice(0, filters.length);
            }
          });

          setLoading(false);
        },
      }),
    );
  }, []);

  function onCreateFilter() {
    let filter = {
      stage: null,
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: payeeId || null,
          type: 'id',
        },
      ],
    };

    dispatch(
      pushModal('edit-filter', {
        filter,
        onSave: async newFilter => {
          let newFilters = await loadFilters();

          navigator.onEdit(newFilter.id, 'edit');

          setFilters(filters => {
            let newIdx = newFilters.findIndex(
              filter => filter.id === newFilter.id,
            );
            return newFilters.slice(0, newIdx + 75);
          });

          setLoading(false);
        },
      }),
    );
  }

  let onHover = useCallback(id => {
    setHoveredFilter(id);
  }, []);

  if (filters === null) {
    return null;
  }

  return (
    <SelectedProvider instance={selectedInst}>
      <View style={{ overflow: 'hidden' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: isModal ? '0 13px 15px' : '0 0 15px',
            flexShrink: 0,
          }}
        >
          <View
            style={{
              color: colors.n4,
              flexDirection: 'row',
              alignItems: 'center',
              width: '50%',
            }}
          >
            <Text>Something to say about filters.</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Input
            placeholder="Filter..."
            value={filter}
            onChange={e => {
              setFilter(e.target.value);
              navigator.onEdit(null);
            }}
            style={{
              width: 350,
              borderColor: isModal ? null : 'transparent',
              backgroundColor: isModal ? null : colors.n11,
              ':focus': isModal
                ? null
                : {
                    backgroundColor: 'white',
                    '::placeholder': { color: colors.n8 },
                  },
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FiltersHeader />
          <SimpleTable
            ref={tableRef}
            data={filteredFilters}
            navigator={navigator}
            loadMore={loadMore}
            // Hide the last border of the item in the table
            style={{ marginBottom: -1 }}
          >
            <FiltersList
              filters={filteredFilters}
              selectedItems={selectedInst.items}
              navigator={navigator}
              hoveredFilter={hoveredFilter}
              onHover={onHover}
              onEditFilter={onEditFilter}
            />
          </SimpleTable>
        </View>
        <View
          style={{
            paddingBlock: 15,
            paddingInline: isModal ? 13 : 0,
            borderTop: isModal && '1px solid ' + colors.border,
            flexShrink: 0,
          }}
        >
          <Stack direction="row" align="center" justify="flex-end" spacing={2}>
            {selectedInst.items.size > 0 && (
              <Button onClick={onDeleteSelected}>
                Delete {selectedInst.items.size} filters
              </Button>
            )}
            <Button primary onClick={onCreateFilter}>
              Create new filter
            </Button>
          </Stack>
        </View>
      </View>
    </SelectedProvider>
  );
}

export default function ManageFilters({
  isModal,
  payeeId,
  setLoading = () => {},
}) {
  return (
    <SchedulesQuery.Provider>
      <ManageFiltersContent
        isModal={isModal}
        payeeId={payeeId}
        setLoading={setLoading}
      />
    </SchedulesQuery.Provider>
  );
}
