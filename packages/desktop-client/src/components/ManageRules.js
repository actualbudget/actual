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

import useSelected, {
  useSelectedDispatch,
  useSelectedItems,
  SelectedProvider,
} from '../hooks/useSelected';
import ArrowRight from '../icons/v0/RightArrow2';
import { colors } from '../style';

import Button from './common/Button';
import ExternalLink from './common/ExternalLink';
import LinkButton from './common/LinkButton';
import Search from './common/Search';
import Stack from './common/Stack';
import Text from './common/Text';
import View from './common/View';
import { SelectCell, Row, Field, Cell, CellButton, TableHeader } from './table';

let SchedulesQuery = liveQueryContext(q('schedules').select('*'));

export function Value({
  value,
  field,
  valueIsRaw,
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
      switch (field) {
        case 'amount':
          return integerToCurrency(value);
        case 'date':
          if (value) {
            if (value.frequency) {
              return getRecurringDescription(value);
            }
            return formatDate(parseISO(value), dateFormat);
          }
          return null;
        case 'month':
          return value
            ? formatDate(parseISO(value), getMonthYearFormat(dateFormat))
            : null;
        case 'year':
          return value ? formatDate(parseISO(value), 'yyyy') : null;
        case 'notes':
        case 'imported_payee':
          return value;
        case 'payee':
        case 'category':
        case 'account':
        case 'rule':
          if (valueIsRaw) {
            return value;
          }
          if (data && data.length) {
            let item = data.find(item => item.id === value);
            if (item) {
              return describe(item);
            } else {
              return '(deleted)';
            }
          }

          return '…';
        default:
          throw new Error(`Unknown field ${field}`);
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
            <LinkButton onClick={onExpand} style={{ color: colors.p4 }}>
              {numHidden} more items...
            </LinkButton>
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

function ConditionExpression({
  field,
  op,
  value,
  options,
  prefix,
  style,
  inline,
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
      {prefix && <Text style={{ color: colors.n3 }}>{prefix} </Text>}
      <Text style={{ color: colors.p4 }}>{mapField(field, options)}</Text>{' '}
      <Text style={{ color: colors.n3 }}>{friendlyOp(op)}</Text>{' '}
      <Value value={value} field={field} inline={inline} />
    </View>
  );
}

function describeSchedule(schedule, payee) {
  if (payee) {
    return `${payee.name} (${schedule.next_date})`;
  } else {
    return `Next: ${schedule.next_date}`;
  }
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
      describe={schedule => describeSchedule(schedule, byId[schedule._payee])}
    />
  );
}

function ActionExpression({ field, op, value, options, style }) {
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

let Rule = memo(({ rule, hovered, selected, onHover, onEditRule }) => {
  let dispatchSelected = useSelectedDispatch();
  let borderColor = selected ? colors.b8 : colors.border;
  let backgroundFocus = hovered;

  return (
    <Row
      height="auto"
      borderColor={borderColor}
      backgroundColor={
        selected ? colors.selected : backgroundFocus ? colors.hover : 'white'
      }
      style={{ fontSize: 13, zIndex: selected ? 101 : 'auto' }}
      collapsed="true"
      onMouseEnter={() => onHover && onHover(rule.id)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <SelectCell
        exposed={hovered || selected}
        focused={true}
        onSelect={e => {
          dispatchSelected({ type: 'select', id: rule.id, event: e });
        }}
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
              padding: '3px 5px',
            }}
          >
            {rule.stage}
          </View>
        )}
      </Cell>

      <Field width="flex" style={{ padding: '15px 0' }} truncate={false}>
        <Stack direction="row" align="center">
          <View
            style={{ flex: 1, alignItems: 'flex-start' }}
            data-testid="conditions"
          >
            {rule.conditions.map((cond, i) => (
              <ConditionExpression
                key={i}
                field={cond.field}
                op={cond.op}
                inline={true}
                value={cond.value}
                options={cond.options}
                prefix={i > 0 ? friendlyOp(rule.conditionsOp) : null}
                style={i !== 0 && { marginTop: 3 }}
              />
            ))}
          </View>

          <Text>
            <ArrowRight color={colors.n4} style={{ width: 12, height: 12 }} />
          </Text>

          <View
            style={{ flex: 1, alignItems: 'flex-start' }}
            data-testid="actions"
          >
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

      <Cell name="edit" plain style={{ padding: '0 15px', paddingLeft: 5 }}>
        <Button as={CellButton} onSelect={() => onEditRule(rule)}>
          Edit
        </Button>
      </Cell>
    </Row>
  );
});

let SimpleTable = forwardRef(
  ({ data, loadMore, style, onHoverLeave, children, ...props }, ref) => {
    let contentRef = useRef();
    let contentHeight = useRef();
    let scrollRef = useRef();

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
        data-testid="table"
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

function RulesHeader() {
  let selectedItems = useSelectedItems();
  let dispatchSelected = useSelectedDispatch();

  return (
    <TableHeader version="v2" style={{}}>
      <SelectCell
        exposed={true}
        focused={false}
        selected={selectedItems.size > 0}
        onSelect={e => dispatchSelected({ type: 'select-all', event: e })}
      />
      <Cell value="Stage" width={50} />
      <Cell value="Rule" width="flex" />
    </TableHeader>
  );
}

function RulesList({
  rules,
  selectedItems,
  hoveredRule,
  collapsed: borderCollapsed,
  onHover,
  onCollapse,
  onEditRule,
}) {
  if (rules.length === 0) {
    return null;
  }

  return (
    <View>
      {rules.map(rule => {
        let hovered = hoveredRule === rule.id;
        let selected = selectedItems.has(rule.id);

        return (
          <Rule
            key={rule.id}
            rule={rule}
            hovered={hovered}
            selected={selected}
            onHover={onHover}
            onEditRule={onEditRule}
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

function ruleToString(rule, data) {
  let conditions = rule.conditions.flatMap(cond => [
    mapField(cond.field),
    friendlyOp(cond.op),
    cond.op === 'oneOf' || cond.op === 'notOneOf'
      ? cond.value.map(v => mapValue(cond.field, v, data)).join(', ')
      : mapValue(cond.field, cond.value, data),
  ]);
  let actions = rule.actions.flatMap(action => {
    if (action.op === 'set') {
      return [
        friendlyOp(action.op),
        mapField(action.field),
        'to',
        mapValue(action.field, action.value, data),
      ];
    } else if (action.op === 'link-schedule') {
      let schedule = data.schedules.find(s => s.id === action.value);
      return [
        friendlyOp(action.op),
        describeSchedule(
          schedule,
          data.payees.find(p => p.id === schedule._payee),
        ),
      ];
    } else {
      return [];
    }
  });
  return (
    (rule.stage || '') + ' ' + conditions.join(' ') + ' ' + actions.join(' ')
  );
}

function ManageRulesContent({ isModal, payeeId, setLoading }) {
  let [allRules, setAllRules] = useState(null);
  let [rules, setRules] = useState(null);
  let [filter, setFilter] = useState('');
  let dispatch = useDispatch();

  let { data: schedules } = SchedulesQuery.useQuery();
  let filterData = useSelector(state => ({
    payees: state.queries.payees,
    categories: state.queries.categories.list,
    accounts: state.queries.accounts,
    schedules,
  }));

  let filteredRules = useMemo(
    () =>
      filter === '' || !rules
        ? rules
        : rules.filter(rule =>
            ruleToString(rule, filterData)
              .toLowerCase()
              .includes(filter.toLowerCase()),
          ),
    [rules, filter, filterData],
  );
  let selectedInst = useSelected('manage-rules', allRules, []);
  let [hoveredRule, setHoveredRule] = useState(null);
  let tableRef = useRef(null);

  async function loadRules() {
    setLoading(true);

    let loadedRules = null;
    if (payeeId) {
      loadedRules = await send('payees-get-rules', {
        id: payeeId,
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
      ...selectedInst.items,
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
        },
      }),
    );
  }, []);

  function onCreateRule() {
    let rule = {
      stage: null,
      conditionsOp: 'and',
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: payeeId || null,
          type: 'id',
        },
      ],
      actions: [
        {
          op: 'set',
          field: 'category',
          value: null,
          type: 'id',
        },
      ],
    };

    dispatch(
      pushModal('edit-rule', {
        rule,
        onSave: async newRule => {
          let newRules = await loadRules();

          setRules(rules => {
            let newIdx = newRules.findIndex(rule => rule.id === newRule.id);
            return newRules.slice(0, newIdx + 75);
          });

          setLoading(false);
        },
      }),
    );
  }

  let onHover = useCallback(id => {
    setHoveredRule(id);
  }, []);

  if (rules === null) {
    return null;
  }

  return (
    <SelectedProvider instance={selectedInst}>
      <View>
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
            <Text>
              Rules are always run in the order that you see them.{' '}
              <ExternalLink
                to="https://actualbudget.org/docs/budgeting/rules/"
                linkColor="muted"
              >
                Learn more
              </ExternalLink>
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Search
            placeholder="Filter rules..."
            value={filter}
            onChange={setFilter}
          />
        </View>
        <View style={{ flex: 1 }}>
          <RulesHeader />
          <SimpleTable
            ref={tableRef}
            data={filteredRules}
            loadMore={loadMore}
            // Hide the last border of the item in the table
            style={{ marginBottom: -1 }}
          >
            <RulesList
              rules={filteredRules}
              selectedItems={selectedInst.items}
              hoveredRule={hoveredRule}
              onHover={onHover}
              onEditRule={onEditRule}
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
                Delete {selectedInst.items.size} rules
              </Button>
            )}
            <Button type="primary" onClick={onCreateRule}>
              Create new rule
            </Button>
          </Stack>
        </View>
      </View>
    </SelectedProvider>
  );
}

export default function ManageRules({
  isModal,
  payeeId,
  setLoading = () => {},
}) {
  return (
    <SchedulesQuery.Provider>
      <ManageRulesContent
        isModal={isModal}
        payeeId={payeeId}
        setLoading={setLoading}
      />
    </SchedulesQuery.Provider>
  );
}
