import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { format as formatDate, parseISO } from 'date-fns';
import { css } from 'glamor';

import { pushModal } from 'loot-core/src/client/actions/modals';
import { initiallyLoadPayees } from 'loot-core/src/client/actions/queries';
import q from 'loot-core/src/client/query-helpers';
import { liveQueryContext } from 'loot-core/src/client/query-hooks';
import { getPayeesById } from 'loot-core/src/client/reducers/queries';
import { send } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { getMonthYearFormat } from 'loot-core/src/shared/months';
import { mapField, friendlyOp } from 'loot-core/src/shared/rules';
import { getRecurringDescription } from 'loot-core/src/shared/schedules';
import { integerToCurrency } from 'loot-core/src/shared/util';
import {
  View,
  Text,
  Button,
  Stack,
  ExternalLink
} from 'loot-design/src/components/common';
import {
  SelectCell,
  Row,
  Field,
  Cell,
  CellButton,
  TableHeader,
  useTableNavigator
} from 'loot-design/src/components/table';
import useSelected, {
  useSelectedDispatch,
  useSelectedItems,
  SelectedProvider
} from 'loot-design/src/components/useSelected';
import { colors } from 'loot-design/src/style';
import ArrowRight from 'loot-design/src/svg/v0/RightArrow2';

let SchedulesQuery = liveQueryContext(q('schedules').select('*'));

export function Value({
  value,
  field,
  inline = false,
  data: dataProp,
  describe = x => x.name
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
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy'
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
      } else {
        let name = value;
        if (data) {
          let item = data.find(item => item.id === value);
          if (item) {
            name = describe(item);
          }
        }
        return name;
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
                ':hover': { textDecoration: 'underline' }
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
  style
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
          textOverflow: 'ellipsis'
        },
        style
      ]}
    >
      <Text style={{ color: colors.p4 }}>{mapField(field, options)}</Text>{' '}
      <Text style={{ color: colors.n3 }}>{friendlyOp(op)}</Text>{' '}
      <Value value={value} field={field} />
    </View>
  );
}

function ScheduleValue({ value }) {
  let payees = useSelector(state => state.queries.payees);
  let byId = getPayeesById(payees);
  let { data: schedules } = SchedulesQuery.useQuery();

  return (
    <Value
      value={value}
      field="rule"
      data={schedules}
      describe={s => {
        let payeeId = s._payee;
        return byId[payeeId]
          ? `${byId[payeeId].name} (${s.next_date})`
          : `Next: ${s.next_date}`;
      }}
    />
  );
}

export function ActionExpression({ field, op, value, options, style }) {
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
          textOverflow: 'ellipsis'
        },
        style
      ]}
    >
      {op === 'set' ? (
        <>
          <Text style={{ color: colors.n3 }}>{friendlyOp(op)}</Text>{' '}
          <Text style={{ color: colors.p4 }}>{mapField(field, options)}</Text>{' '}
          <Text style={{ color: colors.n3 }}>to </Text>
          <Value value={value} field={field} />
        </>
      ) : op === 'link-schedule' ? (
        <>
          <Text style={{ color: colors.n3 }}>{friendlyOp(op)}</Text>{' '}
          <ScheduleValue value={value} />
        </>
      ) : null}
    </View>
  );
}

let Rule = React.memo(
  ({
    rule,
    hovered,
    selected,
    editing,
    focusedField,
    onHover,
    onEdit,
    onEditRule
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
        onMouseEnter={() => onHover && onHover(rule.id)}
        onMouseLeave={() => onHover && onHover(null)}
      >
        <SelectCell
          exposed={hovered || selected || editing}
          focused={focusedField === 'select'}
          onSelect={() => {
            dispatchSelected({ type: 'select', id: rule.id });
          }}
          onEdit={() => onEdit(rule.id, 'select')}
          selected={selected}
        />

        <Cell name="stage" width={50} plain style={{ color: colors.n5 }}>
          {rule.stage && (
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                backgroundColor: colors.b10,
                color: colors.b1,
                borderRadius: 4,
                padding: '3px 5px'
              }}
            >
              {rule.stage}
            </View>
          )}
        </Cell>

        <Field width="flex" style={{ padding: '15px 0' }} truncate={false}>
          <Stack direction="row" align="center">
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              {rule.conditions.map((cond, i) => (
                <ConditionExpression
                  key={i}
                  field={cond.field}
                  op={cond.op}
                  value={cond.value}
                  options={cond.options}
                  stage={rule.stage}
                  style={i !== 0 && { marginTop: 3 }}
                />
              ))}
            </View>

            <Text>
              <ArrowRight color={colors.n4} style={{ width: 12, height: 12 }} />
            </Text>

            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              {rule.actions.map((action, i) => (
                <ActionExpression
                  key={i}
                  field={action.field}
                  op={action.op}
                  value={action.value}
                  options={action.options}
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
            onSelect={() => onEditRule(rule)}
            onEdit={() => onEdit(rule.id, 'edit')}
          >
            Edit
          </Button>
        </Cell>
      </Row>
    );
  }
);

let SimpleTable = React.forwardRef(
  (
    { data, navigator, loadMore, style, onHoverLeave, children, ...props },
    ref
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
            '& .animated .animated-row': { transition: '.25s transform' }
          },
          style
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
  }
);

function RulesHeader() {
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
      <Cell value="Stage" width={50} />
      <Cell value="Rule" width="flex" />
    </TableHeader>
  );
}

function RulesList({
  rules,
  selectedItems,
  navigator,
  hoveredRule,
  collapsed: borderCollapsed,
  onHover,
  onCollapse,
  onEditRule
}) {
  if (rules.length === 0) {
    return null;
  }

  return (
    <View>
      {rules.map(rule => {
        let hovered = hoveredRule === rule.id;
        let selected = selectedItems.has(rule.id);
        let editing = navigator.editingId === rule.id;

        return (
          <Rule
            key={rule.id}
            rule={rule}
            hovered={hovered}
            selected={selected}
            editing={editing}
            focusedField={editing && navigator.focusedField}
            onHover={onHover}
            onEdit={navigator.onEdit}
            onEditRule={onEditRule}
          />
        );
      })}
    </View>
  );
}

export default function ManageRules({
  isModal,
  payeeId,
  setLoading = () => {}
}) {
  let [allRules, setAllRules] = useState(null);
  let [rules, setRules] = useState(null);
  let dispatch = useDispatch();
  let navigator = useTableNavigator(rules, ['select', 'edit']);
  let selectedInst = useSelected('manage-rules', allRules, []);
  let [hoveredRule, setHoveredRule] = useState(null);
  let tableRef = useRef(null);

  async function loadRules() {
    setLoading(true);

    let loadedRules = null;
    if (payeeId) {
      loadedRules = await send('payees-get-rules', {
        id: payeeId
      });
    } else {
      loadedRules = await send('rules-get');
    }

    setAllRules(loadedRules);
    return loadedRules;
  }

  useEffect(() => {
    async function loadData() {
      let loadedRules = await loadRules();
      setRules(loadedRules.slice(0, 100));
      setLoading(false);

      await dispatch(initiallyLoadPayees());
    }

    undo.setUndoState('openModal', 'manage-rules');

    loadData();

    return () => {
      undo.setUndoState('openModal', null);
    };
  }, []);

  function loadMore() {
    setRules(rules.concat(allRules.slice(rules.length, rules.length + 50)));
  }

  async function onDeleteSelected() {
    setLoading(true);
    let { someDeletionsFailed } = await send('rule-delete-all', [
      ...selectedInst.items
    ]);

    if (someDeletionsFailed) {
      alert('Some rules were not deleted because they are linked to schedules');
    }

    let newRules = await loadRules();
    setRules(rules => {
      return newRules.slice(0, rules.length);
    });
    selectedInst.dispatch({ type: 'select-none' });
    setLoading(false);
  }

  let onEditRule = useCallback(rule => {
    dispatch(
      pushModal('edit-rule', {
        rule,
        onSave: async newRule => {
          let newRules = await loadRules();

          setRules(rules => {
            let newIdx = newRules.findIndex(rule => rule.id === newRule.id);

            if (newIdx > rules.length) {
              return newRules.slice(0, newIdx + 75);
            } else {
              return newRules.slice(0, rules.length);
            }
          });

          setLoading(false);
        }
      })
    );
  }, []);

  function onCreateRule() {
    let rule = {
      stage: null,
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: payeeId || null,
          type: 'id'
        }
      ],
      actions: [
        {
          op: 'set',
          field: 'category',
          value: null,
          type: 'id'
        }
      ]
    };

    dispatch(
      pushModal('edit-rule', {
        rule,
        onSave: async newRule => {
          let newRules = await loadRules();

          navigator.onEdit(newRule.id, 'edit');

          setRules(rules => {
            let newIdx = newRules.findIndex(rule => rule.id === newRule.id);
            return newRules.slice(0, newIdx + 75);
          });

          setLoading(false);
        }
      })
    );
  }

  let onHover = useCallback(id => {
    setHoveredRule(id);
  }, []);

  if (rules === null) {
    return null;
  }

  let actions = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: isModal ? '13px 15px' : '0 0 15px',
        borderTop: '1px solid ' + colors.border
      }}
    >
      <View
        style={{
          color: colors.n4,
          flexDirection: 'row',
          alignItems: 'center',
          width: '50%'
        }}
      >
        <Text>
          Rules are always run in the order that you see them.{' '}
          <ExternalLink
            asAnchor={true}
            href="https://actualbudget.github.io/docs/Budgeting/rules/"
            style={{ color: colors.n4 }}
          >
            Learn more
          </ExternalLink>
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <Stack direction="row" align="center" justify="flex-end" spacing={2}>
        {selectedInst.items.size > 0 && (
          <Button onClick={onDeleteSelected}>
            Delete {selectedInst.items.size} rules
          </Button>
        )}
        <Button primary onClick={onCreateRule}>
          Create new rule
        </Button>
      </Stack>
    </View>
  );

  return (
    <SchedulesQuery.Provider>
      <SelectedProvider instance={selectedInst}>
        <View style={{ overflow: 'hidden' }}>
          {!isModal && actions}
          <View style={{ flex: 1 }}>
            <RulesHeader />
            <SimpleTable
              ref={tableRef}
              data={rules}
              navigator={navigator}
              loadMore={loadMore}
              // Hide the last border of the item in the table
              style={{ marginBottom: -1 }}
            >
              <RulesList
                rules={rules}
                selectedItems={selectedInst.items}
                navigator={navigator}
                hoveredRule={hoveredRule}
                onHover={onHover}
                onEditRule={onEditRule}
              />
            </SimpleTable>
          </View>
          {isModal && actions}
        </View>
      </SelectedProvider>
    </SchedulesQuery.Provider>
  );
}
