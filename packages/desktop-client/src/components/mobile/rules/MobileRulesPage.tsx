import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { getNormalisedString } from 'loot-core/shared/normalisation';
import { q } from 'loot-core/shared/query';
import { type RuleEntity } from 'loot-core/types/models';

import { AddRuleButton } from './AddRuleButton';
import { RulesList } from './RulesList';

import { Search } from '@desktop-client/components/common/Search';
import { ruleToString } from '@desktop-client/components/ManageRules';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { useUrlParam } from '@desktop-client/hooks/useUrlParam';

const PAGE_SIZE = 50;

export function MobileRulesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [visibleRulesParam] = useUrlParam('visible-rules');
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

  const visibleRules = useMemo(() => {
    if (!visibleRulesParam || visibleRulesParam.trim() === '') {
      return allRules;
    }

    const visibleRuleIdsSet = new Set(
      visibleRulesParam.split(',').map(id => id.trim()),
    );
    return allRules.filter(rule => visibleRuleIdsSet.has(rule.id));
  }, [allRules, visibleRulesParam]);

  const filteredRules = useMemo(() => {
    const rules = visibleRules.filter(rule => {
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
  }, [visibleRules, filter, filterData, schedules]);

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

  const handleRulePress = useCallback(
    (rule: RuleEntity) => {
      navigate(`/rules/${rule.id}`);
    },
    [navigate],
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreRules && !filter) {
      loadRules(true);
    }
  }, [isLoading, hasMoreRules, filter, loadRules]);

  const onSearchChange = useCallback(
    (value: string) => {
      setFilter(value);
    },
    [setFilter],
  );

  return (
    <Page
      header={
        <MobilePageHeader title={t('Rules')} rightContent={<AddRuleButton />} />
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
