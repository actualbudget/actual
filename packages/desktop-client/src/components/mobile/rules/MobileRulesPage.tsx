import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen } from '@actual-app/core/platform/client/connection';
import * as undo from '@actual-app/core/platform/client/undo';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import { q } from '@actual-app/core/shared/query';
import type { RuleEntity } from '@actual-app/core/types/models';

import { Search } from '#components/common/Search';
import { ruleToString } from '#components/ManageRules';
import { MobilePageHeader, Page } from '#components/Page';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useNavigate } from '#hooks/useNavigate';
import { usePayees } from '#hooks/usePayees';
import { useRules } from '#hooks/useRules';
import { useSchedules } from '#hooks/useSchedules';
import { useUndo } from '#hooks/useUndo';
import { useUrlParam } from '#hooks/useUrlParam';
import { useDeleteRuleMutation } from '#rules';

import { AddRuleButton } from './AddRuleButton';
import { RulesList } from './RulesList';

export function MobileRulesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showUndoNotification } = useUndo();
  const [visibleRulesParam] = useUrlParam('visible-rules');
  const [filter, setFilter] = useState('');

  const {
    data: allRules = [],
    isLoading: isRulesLoading,
    refetch: refetchRules,
  } = useRules();
  const { schedules = [] } = useSchedules({
    query: useMemo(() => q('schedules').select('*'), []),
  });
  const { data: { list: categories } = { list: [] } } = useCategories();
  const { data: payees = [] } = usePayees();
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

  // Listen for undo events to refresh rules list
  useEffect(() => {
    const onUndo = () => {
      void refetchRules();
    };

    const lastUndoEvent = undo.getUndoState('undoEvent');
    if (lastUndoEvent) {
      onUndo();
    }

    return listen('undo-event', onUndo);
  }, [refetchRules]);

  const handleRulePress = useCallback(
    (rule: RuleEntity) => {
      void navigate(`/rules/${rule.id}`);
    },
    [navigate],
  );

  const onSearchChange = useCallback(
    (value: string) => {
      setFilter(value);
    },
    [setFilter],
  );

  const { mutate: deleteRule } = useDeleteRuleMutation();

  const handleRuleDelete = useCallback(
    (rule: RuleEntity) => {
      deleteRule(
        { id: rule.id },
        {
          onSuccess: () => {
            showUndoNotification({
              message: t('Rule deleted successfully'),
            });
          },
        },
      );
    },
    [deleteRule, showUndoNotification, t, refetchRules],
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
        isLoading={isRulesLoading}
        onRulePress={handleRulePress}
        onRuleDelete={handleRuleDelete}
      />
    </Page>
  );
}
