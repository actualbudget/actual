// @ts-strict-ignore
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type SetStateAction,
  type Dispatch,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import * as undo from 'loot-core/platform/client/undo';
import { getNormalisedString } from 'loot-core/shared/normalisation';
import { q } from 'loot-core/shared/query';
import { mapField, friendlyOp } from 'loot-core/shared/rules';
import { describeSchedule } from 'loot-core/shared/schedules';
import { type RuleEntity, type NewRuleEntity } from 'loot-core/types/models';

import { InfiniteScrollWrapper } from './common/InfiniteScrollWrapper';
import { Link } from './common/Link';
import { Search } from './common/Search';
import { RulesHeader } from './rules/RulesHeader';
import { RulesList } from './rules/RulesList';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import {
  useSelected,
  SelectedProvider,
} from '@desktop-client/hooks/useSelected';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { initiallyLoadPayees } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';

export type FilterData = {
  payees?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  accounts?: Array<{ id: string; name: string }>;
  schedules?: readonly {
    id: string;
    rule: string;
    _payee: string;
    completed: boolean;
  }[];
};

export function mapValue(
  field: string,
  value: unknown,
  { payees = [], categories = [], accounts = [] }: Partial<FilterData>,
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

export function ruleToString(rule: RuleEntity, data: FilterData) {
  const conditions = rule.conditions.flatMap(cond => [
    mapField(cond.field),
    friendlyOp(cond.op),
    cond.op === 'oneOf' || cond.op === 'notOneOf'
      ? Array.isArray(cond.value)
        ? cond.value.map(v => mapValue(cond.field, v, data)).join(', ')
        : mapValue(cond.field, cond.value, data)
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
      const schedule = data.schedules?.find(s => s.id === String(action.value));
      return [
        friendlyOp(action.op),
        describeSchedule(
          schedule,
          data.payees?.find(p => p.id === schedule?._payee),
        ),
      ];
    } else if (action.op === 'prepend-notes' || action.op === 'append-notes') {
      const noteValue = String(action.value || '');
      return [friendlyOp(action.op), '\u201c' + noteValue + '\u201d'];
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
  const { t } = useTranslation();

  const [allRules, setAllRules] = useState<RuleEntity[]>([]);
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

  const filteredRules = useMemo(() => {
    const rules = allRules.filter(rule => {
      const schedule = schedules.find(schedule => schedule.rule === rule.id);
      return schedule ? schedule.completed === false : true;
    });

    return (
      filter === ''
        ? rules
        : rules.filter(rule =>
            getNormalisedString(ruleToString(rule, filterData)).includes(
              getNormalisedString(filter),
            ),
          )
    ).slice(0, 100 + page * 50);
  }, [allRules, filter, filterData, page]);
  const selectedInst = useSelected('manage-rules', filteredRules, []);
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

  const onDeleteSelected = useCallback(async () => {
    setLoading(true);

    const { someDeletionsFailed } = await send('rule-delete-all', [
      ...selectedInst.items,
    ]);

    if (someDeletionsFailed) {
      alert(
        t('Some rules were not deleted because they are linked to schedules.'),
      );
    }

    await loadRules();
    selectedInst.dispatch({ type: 'select-none' });
    setLoading(false);
  }, [selectedInst]);

  async function onDeleteRule(id: string) {
    setLoading(true);
    await send('rule-delete', id);
    await loadRules();
    setLoading(false);
  }

  const onEditRule = useCallback(rule => {
    dispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: async () => {
              await loadRules();
              setLoading(false);
            },
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
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: async () => {
              await loadRules();
              setLoading(false);
            },
          },
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
              <Trans>
                Rules are always run in the order that you see them.
              </Trans>{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/budgeting/rules/"
                linkColor="muted"
              >
                <Trans>Learn more</Trans>
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
          <InfiniteScrollWrapper loadMore={loadMore}>
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
          </InfiniteScrollWrapper>
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
                <Trans count={selectedInst.items.size}>
                  Delete {{ count: selectedInst.items.size }} rules
                </Trans>
              </Button>
            )}
            <Button variant="primary" onPress={onCreateRule}>
              <Trans>Create new rule</Trans>
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
