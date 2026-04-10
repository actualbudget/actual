import { useState, useMemo, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd, SvgDelete } from '@actual-app/components/icons/v0';
import { Modal, ModalCloseButton, ModalHeader } from '@actual-app/components/modal';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { v4 as uuidv4 } from 'uuid';

import { integerToCurrency, amountToCurrency } from 'loot-core/shared/util';
import type { TransactionEntity, CategoryGroupEntity, PayeeEntity, AccountEntity } from 'loot-core/types/models';

import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import { InputCell } from '@desktop-client/components/table';
import { useFormat } from '@desktop-client/hooks/useFormat';

type SplitItem = {
  id: string;
  category: string | null;
  amount: number;
  notes: string;
};

type SplitTransactionModalProps = {
  transaction: TransactionEntity;
  childTransactions?: TransactionEntity[];
  categoryGroups: CategoryGroupEntity[];
  dateFormat: string;
  hideFraction: boolean;
  onSave: (parent: TransactionEntity, children: TransactionEntity[]) => Promise<void>;
  onClose: () => void;
};

export function SplitTransactionModal({
  transaction,
  childTransactions = [],
  categoryGroups,
  onSave,
  onClose,
}: SplitTransactionModalProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const [splits, setSplits] = useState<SplitItem[]>(() => {
    if (childTransactions.length > 0) {
      return childTransactions.map(child => ({
        id: child.id,
        category: child.category || null,
        amount: child.amount,
        notes: child.notes || '',
      }));
    }
    // Start with two empty splits
    return [
      { id: uuidv4(), category: null, amount: 0, notes: '' },
      { id: uuidv4(), category: null, amount: 0, notes: '' },
    ];
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  const totalSplitAmount = useMemo(() => {
    return splits.reduce((sum, split) => sum + split.amount, 0);
  }, [splits]);

  const remainingAmount = useMemo(() => {
    return transaction.amount - totalSplitAmount;
  }, [transaction.amount, totalSplitAmount]);

  const isValid = remainingAmount === 0 && splits.every(s => s.category);

  const percentageAllocated = useMemo(() => {
    if (transaction.amount === 0) return 100;
    return Math.abs((totalSplitAmount / transaction.amount) * 100);
  }, [totalSplitAmount, transaction.amount]);

  const handleAddSplit = useCallback(() => {
    setSplits(prev => [
      ...prev,
      { id: uuidv4(), category: null, amount: 0, notes: '' },
    ]);
  }, []);

  const handleRemoveSplit = useCallback((id: string) => {
    setSplits(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleUpdateSplit = useCallback((id: string, field: keyof SplitItem, value: unknown) => {
    setSplits(prev =>
      prev.map(split =>
        split.id === id ? { ...split, [field]: value } : split,
      ),
    );
  }, []);

  const handleDistributeRemainder = useCallback(() => {
    if (remainingAmount === 0 || splits.length === 0) return;

    const amountPerSplit = Math.floor(remainingAmount / splits.length);
    const leftover = remainingAmount - amountPerSplit * splits.length;

    setSplits(prev =>
      prev.map((split, index) => ({
        ...split,
        amount: split.amount + amountPerSplit + (index === 0 ? leftover : 0),
      })),
    );
  }, [remainingAmount, splits.length]);

  const handleSave = useCallback(async () => {
    if (!isValid) return;

    const children: TransactionEntity[] = splits.map(split => ({
      id: split.id.startsWith('temp-') ? uuidv4() : split.id,
      account: transaction.account,
      date: transaction.date,
      amount: split.amount,
      category: split.category,
      notes: split.notes,
      is_child: true,
      parent_id: transaction.id,
      cleared: transaction.cleared,
    } as TransactionEntity));

    await onSave(transaction, children);
    onClose();
  }, [isValid, splits, transaction, onSave, onClose]);

  return (
    <Modal name="split-transaction" onClose={onClose}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Split Transaction')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ padding: 20, maxWidth: 700 }}>
            {/* Parent Transaction Info */}
            <View
              style={{
                padding: 15,
                backgroundColor: theme.tableBackground,
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Transaction Amount:</Trans>
                </Text>
                <Text style={{ ...styles.tnum, fontWeight: 600 }}>
                  {format(transaction.amount, 'financial')}
                </Text>
              </View>
              {transaction.payee && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.pageTextSubdued }}>
                    <Trans>Payee:</Trans>
                  </Text>
                  <Text>{transaction.payee}</Text>
                </View>
              )}
            </View>

            {/* Progress Bar */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: 500 }}>
                  <Trans>Allocated:</Trans> {percentageAllocated.toFixed(1)}%
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: remainingAmount === 0 ? theme.noticeTextLight : theme.warningText,
                  }}
                >
                  <Trans>Remaining:</Trans> {format(remainingAmount, 'financial')}
                </Text>
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: theme.tableBackground,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(percentageAllocated, 100)}%`,
                    backgroundColor:
                      remainingAmount === 0
                        ? theme.noticeBackground
                        : remainingAmount < 0
                          ? theme.errorBackground
                          : theme.warningBackground,
                    transition: 'width 0.3s ease',
                  }}
                />
              </View>
            </View>

            {/* Split Items */}
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  padding: '8px 12px',
                  backgroundColor: theme.tableHeaderBackground,
                  borderRadius: '4px 4px 0 0',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <View style={{ flex: 2 }}>
                  <Trans>Category</Trans>
                </View>
                <View style={{ flex: 1, textAlign: 'right' }}>
                  <Trans>Amount</Trans>
                </View>
                <View style={{ width: 40 }} />
              </View>

              {splits.map((split, index) => (
                <View
                  key={split.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '12px',
                    borderBottom: `1px solid ${theme.tableBorder}`,
                    backgroundColor: theme.tableBackground,
                  }}
                >
                  <View style={{ flex: 2, marginRight: 12 }}>
                    <CategoryAutocomplete
                      categoryGroups={categoryGroups}
                      value={split.category}
                      focused={editingId === split.id && editingField === 'category'}
                      clearOnBlur={false}
                      onUpdate={value => handleUpdateSplit(split.id, 'category', value)}
                      onSelect={() => {}}
                    />
                  </View>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <InputCell
                      value={split.amount !== 0 ? integerToCurrency(Math.abs(split.amount)) : ''}
                      onUpdate={value => {
                        const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
                        const amount = isNaN(parsed) ? 0 : Math.round(parsed * 100);
                        // Match sign of parent transaction
                        const signedAmount = transaction.amount < 0 ? -Math.abs(amount) : Math.abs(amount);
                        handleUpdateSplit(split.id, 'amount', signedAmount);
                      }}
                      inputProps={{
                        placeholder: '0.00',
                        style: {
                          textAlign: 'right',
                          ...styles.tnum,
                        },
                      }}
                    />
                  </View>
                  <View style={{ width: 40, textAlign: 'center' }}>
                    {splits.length > 1 && (
                      <Button
                        variant="bare"
                        onPress={() => handleRemoveSplit(split.id)}
                        style={{ padding: 4 }}
                        aria-label={t('Remove split')}
                      >
                        <SvgDelete width={16} height={16} style={{ color: theme.errorText }} />
                      </Button>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <Button variant="bare" onPress={handleAddSplit}>
                <SvgAdd width={10} height={10} style={{ marginRight: 5 }} />
                <Trans>Add Split</Trans>
              </Button>
              {remainingAmount !== 0 && (
                <Button variant="bare" onPress={handleDistributeRemainder}>
                  <Trans>Distribute Remainder</Trans>
                </Button>
              )}
            </View>

            {/* Validation Message */}
            {!isValid && (
              <View
                style={{
                  padding: 12,
                  backgroundColor: theme.warningBackground,
                  borderRadius: 4,
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 13, color: theme.warningText }}>
                  {remainingAmount !== 0 && (
                    <Trans>
                      Splits must add up to the transaction amount. {format(Math.abs(remainingAmount), 'financial')} remaining.
                    </Trans>
                  )}
                  {remainingAmount === 0 && splits.some(s => !s.category) && (
                    <Trans>All splits must have a category assigned.</Trans>
                  )}
                </Text>
              </View>
            )}

            {/* Footer Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Button variant="normal" onPress={close}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                onPress={handleSave}
                isDisabled={!isValid}
              >
                <Trans>Save Splits</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
