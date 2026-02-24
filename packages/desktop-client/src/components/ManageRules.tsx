// @ts-strict-ignore
import React, { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
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
import { usePayeeRules } from '#hooks/usePayeeRules';
import { usePayees } from '#hooks/usePayees';
import { useRules } from '#hooks/useRules';
import { useSchedules } from '#hooks/useSchedules';
import { SelectedProvider, useSelected } from '#hooks/useSelected';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { useBatchDeleteRulesMutation, useDeleteRuleMutation } from '#rules';
import { friendlyOp, mapField } from '#util/rule';
import { describeSchedule } from '#util/schedule';

import { InfiniteScrollWrapper } from './common/InfiniteScrollWrapper';
import { Link } from './common/Link';
import { Search } from './common/Search';
import { RulesHeader } from './rules/RulesHeader';
import { RulesList } from './rules/RulesList';

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
};

export function ManageRules({ isModal, payeeId }: ManageRulesProps) {
  const { t } = useTranslation();

  const {
    data: allRules = [],
    refetch: refetchAllRules,
    isLoading: isAllRulesLoading,
    isRefetching: isAllRulesRefetching,
  } = useRules({
    enabled: !payeeId,
  });
  const {
    data: payeeRules = [],
    refetch: refetchPayeeRules,
    isLoading: isPayeeRulesLoading,
    isRefetching: isPayeeRulesRefetching,
  } = usePayeeRules({
    payeeId,
  });

  const rulesToUse = payeeId ? payeeRules : allRules;
  const refetchRules = payeeId ? refetchPayeeRules : refetchAllRules;
  const isLoading =
    isAllRulesLoading ||
    isAllRulesRefetching ||
    isPayeeRulesLoading ||
    isPayeeRulesRefetching;

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
    const rules = rulesToUse.filter(rule => {
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
  }, [rulesToUse, filter, filterData, page, schedules]);

  const selectedInst = useSelected('manage-rules', filteredRules, []);
  const [hoveredRule, setHoveredRule] = useState(null);

  const onSearchChange = (value: string) => {
    setFilter(value);
    setPage(0);
  };

  const init = useEffectEvent(() => {
    if (payeeId) {
      undo.setUndoState('openModal', { name: 'manage-rules', options: {} });
    }

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

  const { mutate: batchDeleteRules } = useBatchDeleteRulesMutation();

  const onDeleteSelected = async () => {
    batchDeleteRules(
      {
        ids: [...selectedInst.items],
      },
      {
        onSuccess: () => {
          void refetchRules();
          selectedInst.dispatch({ type: 'select-none' });
        },
      },
    );
  };

  const { mutate: deleteRule } = useDeleteRuleMutation();

  function onDeleteRule(id: string) {
    deleteRule(
      { id },
      {
        onSuccess: () => {
          void refetchRules();
        },
      },
    );
  }

  const onEditRule = rule => {
    dispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: async () => {
              void refetchRules();
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
              void refetchRules();
            },
          },
        },
      }),
    );
  }

  const onHover = id => {
    setHoveredRule(id);
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimatedLoading width={25} height={25} />
      </View>
    );
  }

  const isNonDeletableRuleSelected = schedules.some(schedule =>
    selectedInst.items.has(schedule.rule),
  );

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
        <View style={styles.tableContainer}>
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
          <SpaceBetween gap={10} style={{ justifyContent: 'flex-end' }}>
            {selectedInst.items.size > 0 && (
              <Tooltip
                isOpen={isNonDeletableRuleSelected}
                content={t(
                  'Some selected rules cannot be deleted because they are linked to schedules.',
                )}
              >
                <Button
                  onPress={onDeleteSelected}
                  // isDisabled={isNonDeletableRuleSelected}
                >
                  <Trans count={selectedInst.items.size}>
                    Delete {{ count: selectedInst.items.size }} rules
                  </Trans>
                </Button>
              </Tooltip>
            )}
            <Button variant="primary" onPress={onCreateRule}>
              <Trans>Create new rule</Trans>
            </Button>
          </SpaceBetween>
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
