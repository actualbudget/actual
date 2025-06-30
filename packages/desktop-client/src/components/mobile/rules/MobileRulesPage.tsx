import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { type RuleEntity } from 'loot-core/types/models';

import { AddRuleButton } from './AddRuleButton';
import { RulesList } from './RulesList';

import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useScrollListener } from '@desktop-client/components/ScrollProvider';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { initiallyLoadPayees } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';

export function MobileRulesPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [allRules, setAllRules] = useState<RuleEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);

  const rules = useMemo(() => {
    return allRules.slice(0, 100 + page * 50);
  }, [allRules, page]);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedRules = await send('rules-get');
      setAllRules(loadedRules || []);
    } catch (error) {
      console.error('Failed to load rules:', error);
      setAllRules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onEditRule = useCallback((rule: RuleEntity) => {
    dispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: async () => {
              await loadRules();
            },
          },
        },
      }),
    );
  }, [dispatch, loadRules]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || rules.length >= allRules.length) {
      return;
    }
    
    setIsLoadingMore(true);
    // Simulate loading delay for better UX
    setTimeout(() => {
      setPage(prevPage => prevPage + 1);
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, rules.length, allRules.length]);

  useScrollListener(({ hasScrolledToEnd }) => {
    if (hasScrolledToEnd('down', 100)) {
      loadMore();
    }
  });

  useEffect(() => {
    const loadData = async () => {
      await loadRules();
      await dispatch(initiallyLoadPayees());
    };

    loadData();
  }, [loadRules, dispatch]);

  return (
    <Page
      header={
        <MobilePageHeader
          title={t('Rules')}
          rightContent={<AddRuleButton />}
        />
      }
      padding={0}
    >
      <RulesList
        isLoading={isLoading}
        rules={rules}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        onRulePress={onEditRule}
      />
    </Page>
  );
}