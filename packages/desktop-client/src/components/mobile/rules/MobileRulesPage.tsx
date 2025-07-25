import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { getNormalisedString } from 'loot-core/shared/normalisation';
import { q } from 'loot-core/shared/query';
import { mapField, friendlyOp } from 'loot-core/shared/rules';
import { describeSchedule } from 'loot-core/shared/schedules';
import { type RuleEntity } from 'loot-core/types/models';

import { AddRuleButton } from './AddRuleButton';
import { RulesList } from './RulesList';

import { Search } from '@desktop-client/components/common/Search';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

const PAGE_SIZE = 50;

type FilterData = {
  payees: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  accounts: Array<{ id: string; name: string }>;
  schedules: readonly {
    id: string;
    rule: string;
    _payee: string;
    completed: boolean;
  }[];
};

function mapValue(
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

function ruleToString(rule: RuleEntity, data: FilterData) {
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
      const schedule = data.schedules.find(s => s.id === String(action.value));
      return [
        friendlyOp(action.op),
        describeSchedule(
          schedule,
          data.payees.find(p => p.id === schedule?._payee),
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

export function MobileRulesPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [allRules, setAllRules] = useState<RuleEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMoreRules, setHasMoreRules] = useState(true);
  const [filter, setFilter] = useState('');

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

    return filter === ''
      ? rules
      : rules.filter(rule =>
          getNormalisedString(ruleToString(rule, filterData)).includes(
            getNormalisedString(filter),
          ),
        );
  }, [allRules, filter, filterData, schedules]);

  const loadRules = useCallback(async (append = false) => {
    try {
      setIsLoading(true);
      const result = await send('rules-get');
      const newRules = result || [];

      setAllRules(prevRules =>
        append ? [...prevRules, ...newRules] : newRules,
      );
      setHasMoreRules(newRules.length === PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load rules:', error);
      setAllRules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleRulePress = (rule: RuleEntity) => {
    dispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: () => loadRules(),
          },
        },
      }),
    );
  };

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreRules && !filter) {
      loadRules(true);
    }
  }, [isLoading, hasMoreRules, filter, loadRules]);

  const handleRuleAdded = () => {
    loadRules();
  };

  const onSearchChange = useCallback(
    (value: string) => {
      setFilter(value);
    },
    [setFilter],
  );

  return (
    <Page
      header={
        <MobilePageHeader
          title={t('Rules')}
          rightContent={<AddRuleButton onRuleAdded={handleRuleAdded} />}
        />
      }
      padding={0}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.mobilePageBackground,
          padding: 10,
          width: '100%',
          borderBottomWidth: 2,
          borderBottomStyle: 'solid',
          borderBottomColor: theme.tableBorder,
        }}
      >
        <Search
          placeholder={t('Filter rules…')}
          value={filter}
          onChange={onSearchChange}
          width="100%"
          height={styles.mobileMinHeight}
          style={{
            backgroundColor: theme.tableBackground,
            borderColor: theme.formInputBorder,
          }}
        />
      </View>
      <RulesList
        rules={filteredRules}
        isLoading={isLoading}
        onRulePress={handleRulePress}
        onLoadMore={handleLoadMore}
      />
    </Page>
  );
}
