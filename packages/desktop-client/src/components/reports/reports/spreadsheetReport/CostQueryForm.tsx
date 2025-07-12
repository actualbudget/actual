import React from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { AccountAutocomplete } from '@desktop-client/components/autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import { PayeeAutocomplete } from '@desktop-client/components/autocomplete/PayeeAutocomplete';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { DateSelect } from '@desktop-client/components/select/DateSelect';

type DatePreset =
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

type CostQueryFormProps = {
  selectedCategory: string;
  selectedAccount: string;
  selectedPayee: string;
  notesOp: string;
  selectedNotes: string;
  cleared: boolean | null;
  reconciled: boolean | null;
  transfer: boolean | null;
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  dateFormat: string;
  onCategoryChange: (category: string) => void;
  onAccountChange: (account: string) => void;
  onPayeeChange: (payee: string) => void;
  onNotesOpChange: (op: string) => void;
  onNotesChange: (notes: string) => void;
  onClearedChange: (cleared: boolean | null) => void;
  onReconciledChange: (reconciled: boolean | null) => void;
  onTransferChange: (transfer: boolean | null) => void;
  onDatePresetChange: (preset: DatePreset) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onMinAmountChange: (amount: string) => void;
  onMaxAmountChange: (amount: string) => void;
  getCategoryId: (categoryName: string) => string;
  getAccountId: (accountName: string) => string;
  getPayeeId: (payeeName: string) => string;
  getCategoryName: (categoryId: string) => string;
  getAccountName: (accountId: string) => string;
  getPayeeName: (payeeId: string) => string;
};

export function CostQueryForm({
  selectedCategory,
  selectedAccount,
  selectedPayee,
  notesOp,
  selectedNotes,
  cleared,
  reconciled,
  transfer,
  datePreset,
  startDate,
  endDate,
  minAmount,
  maxAmount,
  dateFormat,
  onCategoryChange,
  onAccountChange,
  onPayeeChange,
  onNotesOpChange,
  onNotesChange,
  onClearedChange,
  onReconciledChange,
  onTransferChange,
  onDatePresetChange,
  onStartDateChange,
  onEndDateChange,
  onMinAmountChange,
  onMaxAmountChange,
  getCategoryId,
  getAccountId,
  getPayeeId,
  getCategoryName,
  getAccountName,
  getPayeeName,
}: CostQueryFormProps) {
  const { t } = useTranslation();

  return (
    <>
      <Text
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.pageText,
          marginBottom: 10,
        }}
      >
        {t('Transaction Filters')}
      </Text>

      <View
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 15,
          marginBottom: 15,
        }}
      >
        <FormField>
          <FormLabel title={t('Category')} />
          <CategoryAutocomplete
            value={getCategoryId(selectedCategory)}
            onSelect={categoryId => {
              onCategoryChange(getCategoryName(categoryId || ''));
            }}
            showHiddenCategories={true}
          />
        </FormField>

        <FormField>
          <FormLabel title={t('Account')} />
          <AccountAutocomplete
            value={getAccountId(selectedAccount)}
            onSelect={accountId => {
              onAccountChange(getAccountName(accountId || ''));
            }}
            includeClosedAccounts={false}
          />
        </FormField>
      </View>

      <FormField style={{ marginBottom: 15 }}>
        <FormLabel title={t('Payee')} />
        <PayeeAutocomplete
          value={getPayeeId(selectedPayee)}
          onSelect={payeeId => {
            onPayeeChange(getPayeeName(payeeId || ''));
          }}
        />
      </FormField>

      <FormField style={{ marginBottom: 15 }}>
        <FormLabel title={t('Notes')} />
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 10,
          }}
        >
          <Select
            value={notesOp}
            onChange={(value: string) => onNotesOpChange(value)}
            options={[
              ['is', t('is')],
              ['contains', t('contains')],
              ['hasTags', t('has tag(s)')],
            ]}
          />
          <Input
            value={selectedNotes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder={
              notesOp === 'hasTags'
                ? t('e.g., #food, #entertainment')
                : t('Enter notes text')
            }
          />
        </View>
      </FormField>

      <View
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 15,
          marginBottom: 15,
        }}
      >
        <FormField>
          <FormLabel title={t('Cleared')} />
          <Select
            value={cleared === null ? '' : cleared.toString()}
            onChange={(value: string) =>
              onClearedChange(value === '' ? null : value === 'true')
            }
            options={[
              ['', t('Any')],
              ['true', t('Yes')],
              ['false', t('No')],
            ]}
          />
        </FormField>

        <FormField>
          <FormLabel title={t('Reconciled')} />
          <Select
            value={reconciled === null ? '' : reconciled.toString()}
            onChange={(value: string) =>
              onReconciledChange(value === '' ? null : value === 'true')
            }
            options={[
              ['', t('Any')],
              ['true', t('Yes')],
              ['false', t('No')],
            ]}
          />
        </FormField>
      </View>

      <FormField style={{ marginBottom: 15 }}>
        <FormLabel title={t('Transfer')} />
        <Select
          value={transfer === null ? '' : transfer.toString()}
          onChange={(value: string) =>
            onTransferChange(value === '' ? null : value === 'true')
          }
          options={[
            ['', t('Any')],
            ['true', t('Yes')],
            ['false', t('No')],
          ]}
        />
      </FormField>

      <FormField style={{ marginBottom: 15 }}>
        <FormLabel title={t('Date Range')} />
        <Select
          value={datePreset}
          onChange={(value: DatePreset) => onDatePresetChange(value)}
          options={[
            ['thisMonth', t('This Month')],
            ['lastMonth', t('Last Month')],
            ['thisYear', t('This Year')],
            ['lastYear', t('Last Year')],
            ['custom', t('Custom Range')],
          ]}
        />
      </FormField>

      {datePreset === 'custom' && (
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 15,
            marginBottom: 15,
          }}
        >
          <FormField>
            <FormLabel title={t('Start Date')} />
            <DateSelect
              value={startDate}
              dateFormat={dateFormat}
              onSelect={onStartDateChange}
              inputProps={{ placeholder: dateFormat.toLowerCase() }}
            />
          </FormField>
          <FormField>
            <FormLabel title={t('End Date')} />
            <DateSelect
              value={endDate}
              dateFormat={dateFormat}
              onSelect={onEndDateChange}
              inputProps={{ placeholder: dateFormat.toLowerCase() }}
            />
          </FormField>
        </View>
      )}

      <View
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 15,
        }}
      >
        <FormField>
          <FormLabel title={t('Min Amount')} />
          <Input
            type="number"
            step="0.01"
            value={minAmount}
            onChange={e => onMinAmountChange(e.target.value)}
            placeholder={t('No minimum')}
          />
        </FormField>
        <FormField>
          <FormLabel title={t('Max Amount')} />
          <Input
            type="number"
            step="0.01"
            value={maxAmount}
            onChange={e => onMaxAmountChange(e.target.value)}
            placeholder={t('No maximum')}
          />
        </FormField>
      </View>
    </>
  );
}
