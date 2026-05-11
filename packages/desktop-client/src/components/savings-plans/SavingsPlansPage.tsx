import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { SavingsPlanEntity } from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import {
  useCreateSavingsPlanMutation,
  useDeleteSavingsPlanMutation,
  useUpdateSavingsPlanMutation,
} from '#savings-plans/mutations';
import { savingsPlanQueries } from '#savings-plans/queries';

import { SavingsPlanCard } from './SavingsPlanCard';
import { SavingsPlanForm } from './SavingsPlanForm';

export function SavingsPlansPage() {
  const { t } = useTranslation();
  const { data: plans = [] } = useQuery(savingsPlanQueries.list());

  const createMutation = useCreateSavingsPlanMutation();
  const updateMutation = useUpdateSavingsPlanMutation();
  const deleteMutation = useDeleteSavingsPlanMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SavingsPlanEntity | null>(
    null,
  );

  function handleCreate(plan: Omit<SavingsPlanEntity, 'id'>) {
    createMutation.mutate(plan);
    setShowForm(false);
  }

  function handleUpdate(plan: Omit<SavingsPlanEntity, 'id'>) {
    if (!editingPlan) return;
    updateMutation.mutate({ id: editingPlan.id, ...plan });
    setEditingPlan(null);
  }

  function handleDelete(id: SavingsPlanEntity['id']) {
    deleteMutation.mutate(id);
  }

  function handleEdit(plan: SavingsPlanEntity) {
    setEditingPlan(plan);
    setShowForm(false);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingPlan(null);
  }

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        paddingTop: 50,
        maxWidth: 900,
        marginInline: 'auto',
        width: '100%',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 25,
            fontWeight: 700,
            color: theme.pageTextPositive,
          }}
        >
          {t('Savings Plans')}
        </Text>
        {!showForm && !editingPlan && (
          <Button variant="primary" onPress={() => setShowForm(true)}>
            <SvgAdd style={{ width: 12, height: 12, marginRight: 4 }} />
            {t('New Plan')}
          </Button>
        )}
      </View>

      {(showForm || editingPlan) && (
        <View style={{ marginBottom: 20 }}>
          <SavingsPlanForm
            plan={editingPlan}
            onSave={editingPlan ? handleUpdate : handleCreate}
            onCancel={handleCancelForm}
          />
        </View>
      )}

      {plans.length === 0 && !showForm ? (
        <View
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            color: theme.pageTextSubdued,
          }}
        >
          <Text style={{ fontSize: 15, marginBottom: 12 }}>
            <Trans>No savings plans yet.</Trans>
          </Text>
          <Text style={{ fontSize: 13, color: theme.pageTextSubdued }}>
            <Trans>
              Create a savings plan to track your progress toward a financial
              goal.
            </Trans>
          </Text>
        </View>
      ) : (
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {plans.map(plan => (
            <SavingsPlanCard
              key={plan.id}
              plan={plan}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}
    </View>
  );
}
