// @ts-strict-ignore
import React, { useEffect, useEffectEvent, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as undo from '@actual-app/core/platform/client/undo';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import { q } from '@actual-app/core/shared/query';
import type {
  NewRuleEntity,
  RuleEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';

import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { usePayees } from '#hooks/usePayees';
import { useSchedules } from '#hooks/useSchedules';
import { SelectedProvider, useSelected } from '#hooks/useSelected';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { friendlyOp, mapField } from '#util/rule';
import { describeSchedule } from '#util/schedule';

import { EmptyMessage } from './common/EmptyMessage';
import { InfiniteScrollWrapper } from './common/InfiniteScrollWrapper';
import { Link } from './common/Link';
import { ManagePage } from './common/ManagePage';
import { Search } from './common/Search';
import { RulesHeader } from './rules/RulesHeader';
import { RulesList } from './rules/RulesList';
import { SelectedItemsButton } from './table';

export type FilterData = {
  payees?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  accounts?: Array<{ id: string; name: string }>;
  schedules?: readonly ScheduleEntity[];
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
        schedule
          ? describeSchedule(
              schedule,
              data.payees?.find(p => p.id === schedule._payee),
            )
          : '-',
      ];
    } else if (action.op === 'prepend-notes' || action.op === 'append-notes') {
      const noteValue = String(action.value || '');
      return [friendlyOp(action.op), '\u201c' + noteValue + '\u201d'];
    } else if (action.op === 'delete-transaction') {
      return [friendlyOp(action.op), '(delete)'];
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
  const { data: { list: categories } = { list: [] } } = useCategories();
  const { data: payees } = usePayees();
  const { data: accounts = [] } = useAccounts();
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
  }, [allRules, filter, filterData, page, schedules]);

  const selectedInst = useSelected('manage-rules', filteredRules, []);
  const [hoveredRule, setHoveredRule] = useState(null);

  const onSearchChange = (value: string) => {
    setFilter(value);
    setPage(0);
  };

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

  const init = useEffectEvent(() => {
    async function loadData() {
      await loadRules();
      setLoading(false);
    }

    if (payeeId) {
      undo.setUndoState('openModal', { name: 'manage-rules', options: {} });
    }

    void loadData();

    return () => {
      undo.setUndoState('openModal', null);
    };
  });
  useEffect(() => {
    return init();
  }, []);

  function loadMore() {
    setPage(page => page + 1);
  }

  const onDeleteSelected = async () => {
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
  };

  async function onDeleteRule(id: string) {
    setLoading(true);
    await send('rule-delete', id);
    await loadRules();
    setLoading(false);
  }

  const onEditRule = rule => {
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
  };

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

  const onHover = id => {
    setHoveredRule(id);
  };

  return (
    <SelectedProvider instance={selectedInst}>
      <ManagePage
        style={isModal ? { paddingInline: spacing.md } : undefined}
        description={
          <>
            <Trans>Rules are always run in the order that you see them.</Trans>{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/budgeting/rules/"
              linkColor="muted"
            >
              <Trans>Learn more</Trans>
            </Link>
          </>
        }
        actions={
          <Button variant="bare" onPress={onCreateRule}>
            <SvgAdd
              width={10}
              height={10}
              style={{ marginRight: spacing.xs }}
            />
            <Trans>Add new rule</Trans>
          </Button>
        }
        search={
          <Search
            placeholder={t('Filter rules…')}
            value={filter}
            onChange={onSearchChange}
          />
        }
        selection={
          <SelectedItemsButton<'delete'>
            id="selected-rules"
            name={count => t('{{count}} rules', { count })}
            items={[{ name: 'delete', text: t('Delete') }]}
            onSelect={onDeleteSelected}
          />
        }
      >
        <View
          style={{
            ...styles.tableContainer,
            backgroundColor: theme.tableBackground,
          }}
        >
          <RulesHeader />
          {filteredRules.length === 0 ? (
            <EmptyMessage>
              <Trans>No rules</Trans>
            </EmptyMessage>
          ) : (
            <InfiniteScrollWrapper loadMore={loadMore}>
              <RulesList
                rules={filteredRules}
                selectedItems={selectedInst.items}
                hoveredRule={hoveredRule}
                onHover={onHover}
                onEditRule={onEditRule}
                onDeleteRule={rule => onDeleteRule(rule.id)}
              />
            </InfiniteScrollWrapper>
          )}
        </View>
      </ManagePage>
    </SelectedProvider>
  );
}
