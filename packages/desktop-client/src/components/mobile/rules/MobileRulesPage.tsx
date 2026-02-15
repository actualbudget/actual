import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { listen, send } from 'loot-core/platform/client/connection';
import * as undo from 'loot-core/platform/client/undo';
import { getNormalisedString } from 'loot-core/shared/normalisation';
import { q } from 'loot-core/shared/query';
import type { RuleEntity } from 'loot-core/types/models';

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
import { useUndo } from '@desktop-client/hooks/useUndo';
import { useUrlParam } from '@desktop-client/hooks/useUrlParam';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function MobileRulesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const [visibleRulesParam] = useUrlParam('visible-rules');
  const [allRules, setAllRules] = useState<RuleEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const { schedules = [] } = useSchedules({
    query: useMemo(() => q('schedules').select('*'), []),
  });
  const { data: { list: categories } = { list: [] } } = useCategories();
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

  const loadRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await send('rules-get');
      const rules = result || [];
      setAllRules(rules);
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

  // Listen for undo events to refresh rules list
  useEffect(() => {
    const onUndo = () => {
      loadRules();
    };

    const lastUndoEvent = undo.getUndoState('undoEvent');
    if (lastUndoEvent) {
      onUndo();
    }

    return listen('undo-event', onUndo);
  }, [loadRules]);

  const handleRulePress = useCallback(
    (rule: RuleEntity) => {
      navigate(`/rules/${rule.id}`);
    },
    [navigate],
  );

  const onSearchChange = useCallback(
    (value: string) => {
      setFilter(value);
    },
    [setFilter],
  );

  const handleRuleDelete = useCallback(
    async (rule: RuleEntity) => {
      try {
        const { someDeletionsFailed } = await send('rule-delete-all', [
          rule.id,
        ]);

        if (someDeletionsFailed) {
          dispatch(
            addNotification({
              notification: {
                type: 'warning',
                message: t(
                  'This rule could not be deleted because it is linked to a schedule.',
                ),
              },
            }),
          );
        } else {
          showUndoNotification({
            message: t('Rule deleted successfully'),
          });
        }

        // Refresh the rules list
        await loadRules();
      } catch (error) {
        console.error('Failed to delete rule:', error);
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Failed to delete rule. Please try again.'),
            },
          }),
        );
      }
    },
    [dispatch, showUndoNotification, t, loadRules],
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
        onRuleDelete={handleRuleDelete}
      />
    </Page>
  );
}
