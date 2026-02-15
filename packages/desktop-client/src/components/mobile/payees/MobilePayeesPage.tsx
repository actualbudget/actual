import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import { getNormalisedString } from 'loot-core/shared/normalisation';
import type { PayeeEntity, RuleEntity } from 'loot-core/types/models';

import { PayeesList } from './PayeesList';

import { Search } from '@desktop-client/components/common/Search';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { usePayeeRuleCounts } from '@desktop-client/hooks/usePayeeRuleCounts';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

export function MobilePayeesPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const payees = usePayees();
  const { showUndoNotification } = useUndo();
  const [filter, setFilter] = useState('');
  const { ruleCounts, isLoading: isRuleCountsLoading } = usePayeeRuleCounts();
  const isLoading = useSelector(
    s => s.payees.isPayeesLoading || s.payees.isCommonPayeesLoading,
  );

  const filteredPayees: PayeeEntity[] = useMemo(() => {
    if (!filter) return payees;
    const norm = getNormalisedString(filter);
    return payees.filter(p => getNormalisedString(p.name).includes(norm));
  }, [payees, filter]);

  const onSearchChange = useCallback((value: string) => {
    setFilter(value);
  }, []);

  const handlePayeePress = useCallback(
    (payee: PayeeEntity) => {
      navigate(`/payees/${payee.id}`);
    },
    [navigate],
  );

  const handlePayeeRuleAction = useCallback(
    async (payee: PayeeEntity) => {
      // View associated rules for the payee
      if ((ruleCounts.get(payee.id) ?? 0) > 0) {
        try {
          const associatedRules: RuleEntity[] = await send('payees-get-rules', {
            id: payee.id,
          });
          const ruleIds = associatedRules.map(rule => rule.id).join(',');
          navigate(`/rules?visible-rules=${ruleIds}`);
          return;
        } catch (error) {
          console.error('Failed to fetch payee rules:', error);
          // Fallback to general rules page
          navigate('/rules');
          return;
        }
      }

      // Create a new rule for the payee
      navigate('/rules/new', {
        state: {
          rule: {
            conditions: [
              {
                field: 'payee',
                op: 'is',
                value: payee.id,
                type: 'id',
              },
            ],
          },
        },
      });
    },
    [navigate, ruleCounts],
  );

  const handlePayeeDelete = useCallback(
    async (payee: PayeeEntity) => {
      try {
        await send('payees-batch-change', { deleted: [{ id: payee.id }] });
        showUndoNotification({
          message: t('Payee "{{name}}" deleted successfully', {
            name: payee.name,
          }),
        });
      } catch (error) {
        console.error('Failed to delete payee:', error);
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Failed to delete payee. Please try again.'),
            },
          }),
        );
      }
    },
    [dispatch, showUndoNotification, t],
  );

  return (
    <Page header={<MobilePageHeader title={t('Payees')} />} padding={0}>
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
          placeholder={t('Filter payees…')}
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
      <PayeesList
        payees={filteredPayees}
        ruleCounts={ruleCounts}
        isRuleCountsLoading={isRuleCountsLoading}
        isLoading={isLoading}
        onPayeePress={handlePayeePress}
        onPayeeDelete={handlePayeeDelete}
        onPayeeRuleAction={handlePayeeRuleAction}
      />
    </Page>
  );
}
