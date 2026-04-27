import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { send } from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';
import { ungroupTransactions } from '@actual-app/core/shared/transactions';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { aqlQuery } from '#queries/aqlQuery';

type Props = Extract<ModalType, { name: 'ml-categorization' }>['options'];

type PredictionEntry = {
  id: string;
  notes: string | null;
  payee: string | null;
  currentCategory: string | null;
  predictedCategory: string | null;
};

type MLResult = { id: string; predictedCategory: string | null };

export function MLCategorizationModal({ transactionIds, onComplete }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<PredictionEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch transactions and predictions on mount
  useEffect(() => {
    async function fetchPredictions() {
      setLoading(true);
      try {
        // Fetch the transactions by IDs
        const { data } = await aqlQuery(
          q('transactions')
            .filter({ id: { $oneof: transactionIds } })
            .select('*')
            .options({ splits: 'grouped' }),
        );
        const transactions = ungroupTransactions(data as TransactionEntity[]);

        // Call ML preview predictions
        const mlResults = (await send('ml-preview-predictions', {
          transactions: transactions.map(t => ({
            id: t.id,
            notes: t.notes ?? null,
          })),
        })) as MLResult[];

        // Combine transaction data with predictions
        const entries: PredictionEntry[] = transactions.map(t => {
          const mlResult = mlResults.find(r => r.id === t.id);
          return {
            id: t.id,
            notes: t.notes ?? null,
            payee: t.payee ?? null,
            currentCategory: t.category ?? null,
            predictedCategory: mlResult?.predictedCategory ?? null,
          };
        });

        setPredictions(entries);
      } catch (error) {
        console.error('Failed to fetch ML predictions:', error);
      }
      setLoading(false);
    }
    fetchPredictions();
  }, [transactionIds]);

  // Update a prediction's category (user can edit)
  function updatePrediction(id: string, category: string | null) {
    setPredictions(prev =>
      prev.map(p => (p.id === id ? { ...p, predictedCategory: category } : p)),
    );
  }

  // Apply predictions and close
  async function handleApply() {
    setSaving(true);
    try {
      // Build updated transactions
      const updated = predictions
        .filter(p => p.predictedCategory !== null)
        .map(p => ({
          id: p.id,
          category: p.predictedCategory,
        })) as Partial<TransactionEntity>[];

      if (updated.length > 0) {
        await send('transactions-batch-update', {
          updated,
          learnCategories: false,
        });
      }

      onComplete(updated as TransactionEntity[]);
    } catch (error) {
      console.error('Failed to apply predictions:', error);
    }
    setSaving(false);
  }

  return (
    <Modal
      name="ml-categorization"
      containerProps={{ style: { width: '500px' } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Predict Categories with AI')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div>{t('Loading predictions...')}</div>
            ) : predictions.length === 0 ? (
              <div>{<Trans>No transactions to predict.</Trans>}</div>
            ) : (
              <>
                <div style={{ marginBottom: '10px', fontStyle: 'italic' }}>
                  {t('Review and edit predictions before applying.')}
                </div>
                <div
                  style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                >
                  {predictions.map(entry => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '10px',
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>
                          {entry.payee || entry.notes || t('(no description)')}
                        </div>
                        {entry.notes && entry.payee && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {entry.notes}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          →
                        </span>
                        <select
                          value={entry.predictedCategory ?? ''}
                          onChange={e =>
                            updatePrediction(
                              entry.id,
                              e.target.value === '' ? null : e.target.value,
                            )
                          }
                          style={{ padding: '5px', minWidth: '150px' }}
                        >
                          <option value="">{t('No category')}</option>
                          {/* TODO: Populate with actual categories */}
                          {entry.predictedCategory && (
                            <option value={entry.predictedCategory}>
                              {entry.predictedCategory}
                            </option>
                          )}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: '20px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                  }}
                >
                  <Button onPress={() => state.close()}>{t('Cancel')}</Button>
                  <Button
                    variant="primary"
                    onPress={handleApply}
                    isDisabled={saving}
                  >
                    {saving ? t('Applying...') : t('Apply Predictions')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
