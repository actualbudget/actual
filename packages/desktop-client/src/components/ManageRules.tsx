// @ts-strict-ignore
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type SetStateAction,
  type Dispatch,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';
import { type QueriesState } from 'loot-core/client/state-types/queries';
import { pushModal } from 'loot-core/src/client/actions/modals';
import { initiallyLoadPayees } from 'loot-core/src/client/actions/queries';
import { send } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { mapField, friendlyOp } from 'loot-core/src/shared/rules';
import { describeSchedule } from 'loot-core/src/shared/schedules';
import { type RuleEntity } from 'loot-core/src/types/models';

import { useCategories } from '../hooks/useCategories';
import { useSelected, SelectedProvider } from '../hooks/useSelected';
import { theme } from '../style';

import { Button } from './common/Button';
import { ExternalLink } from './common/ExternalLink';
import { Search } from './common/Search';
import { Stack } from './common/Stack';
import { Text } from './common/Text';
import { View } from './common/View';
import { RulesHeader } from './rules/RulesHeader';
import { RulesList } from './rules/RulesList';
import { SchedulesQuery } from './rules/SchedulesQuery';
import { SimpleTable } from './rules/SimpleTable';

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
  const conditions = rule.conditions.flatMap(cond => [
    mapField(cond.field),
    friendlyOp(cond.op),
    cond.op === 'oneOf' || cond.op === 'notOneOf'
      ? cond.value.map(v => mapValue(cond.field, v, data)).join(', ')
      : mapValue(cond.field, cond.value, data),
  ]);
  const actions = rule.actions.flatMap(action => {
    if (action.op === 'set') {
      return [
        friendlyOp(action.op),
        mapField(action.field),
        'to',
        mapValue(action.field, action.value, data),
      ];
    } else if (action.op === 'link-schedule') {
      const schedule = data.schedules.find(s => s.id === action.value);
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

type ManageRulesContentProps = {
  isModal: boolean;
  payeeId: string | null;
  setLoading?: Dispatch<SetStateAction<boolean>>;
};

function ManageRulesContent({
  isModal,
  payeeId,
  setLoading,
}: ManageRulesContentProps) {
  const [allRules, setAllRules] = useState([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const dispatch = useDispatch();

  const { data: schedules } = SchedulesQuery.useQuery();
  const { list: categories } = useCategories();
  const state = useSelector<
    State,
    {
      payees: QueriesState['payees'];
      accounts: QueriesState['accounts'];
      schedules: ReturnType<(typeof SchedulesQuery)['useQuery']>;
    }
  >(state => ({
    payees: state.queries.payees,
    accounts: state.queries.accounts,
    schedules,
  }));
  const filterData = useMemo(
    () => ({
      ...state,
      categories,
    }),
    [state, categories],
  );

  const filteredRules = useMemo(
    () =>
      (filter === ''
        ? allRules
        : allRules.filter(rule =>
            ruleToString(rule, filterData)
              .toLowerCase()
              .includes(filter.toLowerCase()),
          )
      ).slice(0, 100 + page * 50),
    [allRules, filter, filterData, page],
  );
  const selectedInst = useSelected('manage-rules', allRules, []);
  const [hoveredRule, setHoveredRule] = useState(null);

  const onSearchChange = useCallback(
    (value: string) => {
      setFilter(value);
      setPage(0);
    },
    [setFilter],
  );

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
      await loadRules();
      setLoading(false);

      await dispatch(initiallyLoadPayees());
    }

    if (payeeId) {
      undo.setUndoState('openModal', 'manage-rules');
    }

    loadData();

    return () => {
      undo.setUndoState('openModal', null);
    };
  }, []);

  function loadMore() {
    setPage(page => page + 1);
  }

  async function onDeleteSelected() {
    setLoading(true);
    const { someDeletionsFailed } = await send('rule-delete-all', [
      ...selectedInst.items,
    ]);

    if (someDeletionsFailed) {
      alert('Some rules were not deleted because they are linked to schedules');
    }

    await loadRules();
    selectedInst.dispatch({ type: 'select-none' });
    setLoading(false);
  }

  const onEditRule = useCallback(rule => {
    dispatch(
      pushModal('edit-rule', {
        rule,
        onSave: async () => {
          await loadRules();
          setLoading(false);
        },
      }),
    );
  }, []);

  function onCreateRule() {
    const rule: RuleEntity = {
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
        onSave: async () => {
          await loadRules();
          setLoading(false);
        },
      }),
    );
  }

  const onHover = useCallback(id => {
    setHoveredRule(id);
  }, []);

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
              color: theme.pageTextLight,
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
            onChange={onSearchChange}
          />
        </View>
        <View style={{ flex: 1 }}>
          <RulesHeader />
          <SimpleTable
            loadMore={loadMore}
            // Hide the last border of the item in the table
            style={{ marginBottom: -1 }}
          >
            {filteredRules.length === 0 ? (
              <EmptyMessage text="No rules" style={{ marginTop: 15 }} />
            ) : (
              <RulesList
                rules={filteredRules}
                selectedItems={selectedInst.items}
                hoveredRule={hoveredRule}
                onHover={onHover}
                onEditRule={onEditRule}
              />
            )}
          </SimpleTable>
        </View>
        <View
          style={{
            paddingBlock: 15,
            paddingInline: isModal ? 13 : 0,
            borderTop: isModal && '1px solid ' + theme.pillBorder,
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

type ManageRulesProps = {
  isModal: boolean;
  payeeId: string | null;
  setLoading?: Dispatch<SetStateAction<boolean>>;
};

export function ManageRules({
  isModal,
  payeeId,
  setLoading = () => {},
}: ManageRulesProps) {
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
