import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import type { PayeeEntity, RuleEntity } from '@actual-app/core/types/models';

import { Search } from '#components/common/Search';
import { MobilePageHeader, Page } from '#components/Page';
import { useNavigate } from '#hooks/useNavigate';
import { usePayeeRuleCounts } from '#hooks/usePayeeRuleCounts';
import { usePayees } from '#hooks/usePayees';
import { useUndo } from '#hooks/useUndo';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { PayeesList } from './PayeesList';

export function MobilePayeesPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: payees = [], isPending } = usePayees();
  const { showUndoNotification } = useUndo();
  const [filter, setFilter] = useState('');
  const { data: ruleCounts = new Map(), isPending: isRuleCountsLoading } =
    usePayeeRuleCounts();

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
      void navigate(`/payees/${payee.id}`);
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
          void navigate(`/rules?visible-rules=${ruleIds}`);
          return;
        } catch (error) {
          console.error('Failed to fetch payee rules:', error);
          // Fallback to general rules page
          void navigate('/rules');
          return;
        }
      }

      // Create a new rule for the payee
      void navigate('/rules/new', {
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
        isLoading={isPending}
        onPayeePress={handlePayeePress}
        onPayeeDelete={handlePayeeDelete}
        onPayeeRuleAction={handlePayeeRuleAction}
      />
    </Page>
  );
}
