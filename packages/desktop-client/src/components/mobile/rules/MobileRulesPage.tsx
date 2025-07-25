import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from 'loot-core/platform/client/fetch';
import { type RuleEntity } from 'loot-core/types/models';

import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { AddRuleButton } from './AddRuleButton';
import { RulesList } from './RulesList';

import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

const PAGE_SIZE = 50;

export function MobileRulesPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [rules, setRules] = useState<RuleEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMoreRules, setHasMoreRules] = useState(true);

  const loadRules = useCallback(async (offset = 0, append = false) => {
    try {
      setIsLoading(true);
      const result = await send('rules-get', { offset, limit: PAGE_SIZE });
      const newRules = result.data || [];
      
      setRules(prevRules => append ? [...prevRules, ...newRules] : newRules);
      setHasMoreRules(newRules.length === PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load rules:', error);
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleRulePress = (rule: RuleEntity) => {
    dispatch(
      pushModal('edit-rule', {
        rule,
        onSave: () => loadRules(),
      }),
    );
  };

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreRules) {
      loadRules(rules.length, true);
    }
  }, [isLoading, hasMoreRules, rules.length, loadRules]);

  const handleRuleAdded = () => {
    loadRules();
  };

  return (
    <Page
      header={
        <MobilePageHeader
          title={t('Rules')}
          rightContent={<AddRuleButton onRuleAdded={handleRuleAdded} />}
        />
      }
    >
      <RulesList
        rules={rules}
        isLoading={isLoading}
        onRulePress={handleRulePress}
        onLoadMore={handleLoadMore}
      />
    </Page>
  );
}