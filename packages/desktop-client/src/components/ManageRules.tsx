// @ts-strict-ignore
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type SetStateAction,
  type Dispatch,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { pushModal } from 'loot-core/client/modals/modalsSlice';
import { initiallyLoadPayees } from 'loot-core/client/queries/queriesSlice';
import { q } from 'loot-core/shared/query';
import { send } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { getNormalisedString } from 'loot-core/src/shared/normalisation';
import { mapField, friendlyOp } from 'loot-core/src/shared/rules';
import { describeSchedule } from 'loot-core/src/shared/schedules';
import { type NewRuleEntity } from 'loot-core/src/types/models';

import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { usePayees } from '../hooks/usePayees';
import { useSelected, SelectedProvider } from '../hooks/useSelected';
import { useDispatch } from '../redux';
import { theme } from '../style';

import { Button } from './common/Button2';
import { Link } from './common/Link';
import { Search } from './common/Search';
import { SimpleTable } from './common/SimpleTable';
import { Stack } from './common/Stack';
import { Text } from './common/Text';
import { View } from './common/View';
import { RulesHeader } from './rules/RulesHeader';
import { RulesList } from './rules/RulesList';

function mapValue(
  field,
  value,
  { payees = [], categories = [], accounts = [] },
) {
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
    } else if (action.op === 'prepend-notes' || action.op === 'append-notes') {
      return [
        friendlyOp(action.op),
        '“' + mapValue(action.field, action.value, data) + '”',
      ];
    } else {
      return [];
    }
  });
  return (
    (rule.stage || '') + ' ' + conditions.join(' ') + ' ' + actions.join(' ')
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
  const [allRules, setAllRules] = useState([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const dispatch = useDispatch();

  const { schedules = [] } = useSchedules({
    query: useMemo(() => q('schedules').select('*'), []),
  });
  const { list: categories } = useCategories();
  const payees = usePayees();
  const accounts = useAccounts();
  const filterData = useMemo(
    () => ({
      payees,
      accounts,
      schedules,
      categories,
    }),
    [payees, accounts, schedules, categories],
  );

  const filteredRules = useMemo(
    () =>
      (filter === ''
        ? allRules
        : allRules.filter(rule =>
            getNormalisedString(ruleToString(rule, filterData)).includes(
              getNormalisedString(filter),
            ),
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
      undo.setUndoState('openModal', { name: 'manage-rules', options: {} });
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
      alert(
        t('Some rules were not deleted because they are linked to schedules'),
      );
    }

    await loadRules();
    selectedInst.dispatch({ type: 'select-none' });
    setLoading(false);
  }

  async function onDeleteRule(id: string) {
    setLoading(true);
    await send('rule-delete', id);
    await loadRules();
    setLoading(false);
  }

  const onEditRule = useCallback(rule => {
    dispatch(
      pushModal({
        name: 'edit-rule',
        options: {
          rule,
          onSave: async () => {
            await loadRules();
            setLoading(false);
          },
        },
      }),
    );
  }, []);

  function onCreateRule() {
    const rule: NewRuleEntity = {
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
      pushModal({
        name: 'edit-rule',
        options: {
          rule,
          onSave: async () => {
            await loadRules();
            setLoading(false);
          },
        },
      }),
    );
  }

  const onHover = useCallback(id => {
    setHoveredRule(id);
  }, []);
  const { t } = useTranslation();

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
              {t('Rules are always run in the order that you see them.')}{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/budgeting/rules/"
                linkColor="muted"
              >
                {t('Learn more')}
              </Link>
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Search
            placeholder={t('Filter rules...')}
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
              <EmptyMessage text={t('No rules')} style={{ marginTop: 15 }} />
            ) : (
              <RulesList
                rules={filteredRules}
                selectedItems={selectedInst.items}
                hoveredRule={hoveredRule}
                onHover={onHover}
                onEditRule={onEditRule}
                onDeleteRule={rule => onDeleteRule(rule.id)}
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
              <Button onPress={onDeleteSelected}>
                Delete {selectedInst.items.size} rules
              </Button>
            )}
            <Button variant="primary" onPress={onCreateRule}>
              {t('Create new rule')}
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
