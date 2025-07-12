/* eslint-disable actual/typography */
import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { AccountAutocomplete } from '@desktop-client/components/autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import { PayeeAutocomplete } from '@desktop-client/components/autocomplete/PayeeAutocomplete';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { DateSelect } from '@desktop-client/components/select/DateSelect';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { usePayees } from '@desktop-client/hooks/usePayees';

type QueryBuilderProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (query: string) => void;
  existingFormula?: string;
};

type QueryType = 'cost' | 'balance' | 'formula' | 'row-operation';
type DatePreset =
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

type ParsedParams = {
  queryType: QueryType;
  category?: string;
  account?: string;
  payee?: string;
  notes?: string;
  notesOp?: string;
  cleared?: boolean;
  reconciled?: boolean;
  transfer?: boolean;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
};

// Function to parse existing formula and extract query parameters
function parseFormulaToQueryParams(formula: string): ParsedParams {
  if (!formula) return { queryType: 'cost' };

  const params: ParsedParams = { queryType: 'cost' };

  // Determine query type based on formula content
  if (formula.includes('cost(')) {
    params.queryType = 'cost';
  } else if (formula.includes('balance(')) {
    params.queryType = 'balance';
  } else if (
    /^row-\d+[+\-*/]row-\d+/.test(formula.trim()) ||
    /^row-\d+$/.test(formula.trim())
  ) {
    params.queryType = 'row-operation';
  } else {
    params.queryType = 'formula';
  }

  // Remove leading = and extract content between { } for cost queries
  const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;
  const queryMatch = cleanFormula.match(/\{([^}]*)\}/);

  if (queryMatch) {
    const queryString = queryMatch[1];

    // Parse category:"value"
    const categoryMatch = queryString.match(/category:\s*"([^"]+)"/);
    if (categoryMatch) {
      params.category = categoryMatch[1];
    }

    // Parse account:"value"
    const accountMatch = queryString.match(/account:\s*"([^"]+)"/);
    if (accountMatch) {
      params.account = accountMatch[1];
    }

    // Parse payee:"value"
    const payeeMatch = queryString.match(/payee:\s*"([^"]+)"/);
    if (payeeMatch) {
      params.payee = payeeMatch[1];
    }

    // Parse notes filters
    const notesMatch = queryString.match(/notes:\s*([^(]+)\(\s*"([^"]+)"\s*\)/);
    if (notesMatch) {
      params.notesOp = notesMatch[1];
      params.notes = notesMatch[2];
    } else {
      const notesSimpleMatch = queryString.match(/notes:\s*"([^"]+)"/);
      if (notesSimpleMatch) {
        params.notesOp = 'is';
        params.notes = notesSimpleMatch[1];
      }
    }

    // Parse boolean filters
    if (queryString.includes('cleared:true')) {
      params.cleared = true;
    } else if (queryString.includes('cleared:false')) {
      params.cleared = false;
    }

    if (queryString.includes('reconciled:true')) {
      params.reconciled = true;
    } else if (queryString.includes('reconciled:false')) {
      params.reconciled = false;
    }

    if (queryString.includes('transfer:true')) {
      params.transfer = true;
    } else if (queryString.includes('transfer:false')) {
      params.transfer = false;
    }

    // Parse date filters
    if (queryString.includes('date:thisMonth')) {
      params.datePreset = 'thisMonth';
    } else if (queryString.includes('date:lastMonth')) {
      params.datePreset = 'lastMonth';
    } else if (queryString.includes('date:thisYear')) {
      params.datePreset = 'thisYear';
    } else if (queryString.includes('date:lastYear')) {
      params.datePreset = 'lastYear';
    } else {
      const dateBetweenMatch = queryString.match(
        /date:between\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/,
      );
      if (dateBetweenMatch) {
        params.datePreset = 'custom';
        params.startDate = dateBetweenMatch[1];
        params.endDate = dateBetweenMatch[2];
      } else {
        const dateGteMatch = queryString.match(/date:gte\(\s*"([^"]+)"\s*\)/);
        if (dateGteMatch) {
          params.datePreset = 'custom';
          params.startDate = dateGteMatch[1];
        }

        const dateLteMatch = queryString.match(/date:lte\(\s*"([^"]+)"\s*\)/);
        if (dateLteMatch) {
          params.datePreset = 'custom';
          params.endDate = dateLteMatch[1];
        }
      }
    }

    // Parse amount filters
    const amountGteMatch = queryString.match(/amount:gte\(\s*([^)]+)\s*\)/);
    if (amountGteMatch) {
      params.minAmount = (parseFloat(amountGteMatch[1]) / 100).toString();
    }

    const amountLteMatch = queryString.match(/amount:lte\(\s*([^)]+)\s*\)/);
    if (amountLteMatch) {
      params.maxAmount = (parseFloat(amountLteMatch[1]) / 100).toString();
    }
  }

  // Parse balance queries
  if (params.queryType === 'balance') {
    const balanceMatch = cleanFormula.match(/balance\(\s*"([^"]+)"\s*\)/);
    if (balanceMatch) {
      params.account = balanceMatch[1];
    }
  }

  return params;
}

export function QueryBuilder({
  isOpen,
  onClose,
  onSave,
  existingFormula,
}: QueryBuilderProps) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  // Get data for ID to name conversion
  const { grouped: categoryGroups } = useCategories();
  const accounts = useAccounts();
  const payees = usePayees();

  // Helper functions to convert IDs to names
  const getCategoryName = (categoryId: string): string => {
    if (!categoryId) return '';
    for (const group of categoryGroups || []) {
      const category = group.categories?.find(cat => cat.id === categoryId);
      if (category) return category.name;
    }
    return categoryId; // fallback to ID if not found
  };

  const getAccountName = (accountId: string): string => {
    if (!accountId) return '';
    const account = accounts?.find(acc => acc.id === accountId);
    return account?.name || accountId; // fallback to ID if not found
  };

  const getPayeeName = (payeeId: string): string => {
    if (!payeeId) return '';
    const payee = payees?.find(p => p.id === payeeId);
    return payee?.name || payeeId; // fallback to ID if not found
  };

  // Helper functions to convert names to IDs (for parsing existing formulas)
  const getCategoryId = (categoryName: string): string => {
    if (!categoryName) return '';
    for (const group of categoryGroups || []) {
      // Try exact match first
      let category = group.categories?.find(cat => cat.name === categoryName);

      if (!category) {
        // Try case-insensitive match
        category = group.categories?.find(
          cat => cat.name.toLowerCase() === categoryName.toLowerCase(),
        );
      }

      if (!category) {
        // Try partial match (useful for emoji encoding issues)
        category = group.categories?.find(
          cat =>
            cat.name.includes(categoryName) || categoryName.includes(cat.name),
        );
      }

      if (category) return category.id;
    }
    return categoryName; // fallback to name if not found
  };

  const getAccountId = (accountName: string): string => {
    if (!accountName) return '';
    const account = accounts?.find(
      acc => acc.name.toLowerCase() === accountName.toLowerCase(),
    );
    return account?.id || accountName; // fallback to name if not found
  };

  const getPayeeId = (payeeName: string): string => {
    if (!payeeName) return '';
    const payee = payees?.find(
      p => p.name.toLowerCase() === payeeName.toLowerCase(),
    );
    return payee?.id || payeeName; // fallback to name if not found
  };

  // Form state
  const [queryType, setQueryType] = useState<QueryType>('cost');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedPayee, setSelectedPayee] = useState<string>('');
  const [selectedNotes, setSelectedNotes] = useState<string>('');
  const [notesOp, setNotesOp] = useState<string>('is');
  const [cleared, setCleared] = useState<boolean | null>(null);
  const [reconciled, setReconciled] = useState<boolean | null>(null);
  const [transfer, setTransfer] = useState<boolean | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [customFormula, setCustomFormula] = useState<string>('');

  // Parse existing formula when modal opens
  useEffect(() => {
    if (isOpen && existingFormula) {
      const params = parseFormulaToQueryParams(existingFormula);
      setQueryType(params.queryType || 'cost');

      // Convert parsed category/account/payee names to the names for display
      setSelectedCategory(params.category || '');
      setSelectedAccount(params.account || '');
      setSelectedPayee(params.payee || '');
      setSelectedNotes(params.notes || '');
      setNotesOp(params.notesOp || 'is');
      setCleared(params.cleared ?? null);
      setReconciled(params.reconciled ?? null);
      setTransfer(params.transfer ?? null);

      setDatePreset((params.datePreset as DatePreset) || 'thisMonth');
      setStartDate(params.startDate || '');
      setEndDate(params.endDate || '');
      setMinAmount(params.minAmount || '');
      setMaxAmount(params.maxAmount || '');

      if (
        params.queryType === 'formula' ||
        params.queryType === 'row-operation'
      ) {
        setCustomFormula(existingFormula);
      }
    }
  }, [isOpen, existingFormula]);

  const generateFormula = () => {
    if (queryType === 'balance') {
      return selectedAccount ? `balance("${selectedAccount}")` : '';
    }

    if (queryType === 'formula' || queryType === 'row-operation') {
      const formula = customFormula.trim();
      // Ensure formula starts with = for proper recognition
      return formula.startsWith('=') ? formula : `=${formula}`;
    }

    // For cost queries
    const filters: string[] = [];

    if (selectedCategory) {
      console.log('QueryBuilder: Adding category filter:', selectedCategory);
      filters.push(`category:"${selectedCategory}"`);
    }

    if (selectedAccount) {
      filters.push(`account:"${selectedAccount}"`);
    }

    if (selectedPayee) {
      filters.push(`payee:"${selectedPayee}"`);
    }

    if (selectedNotes) {
      if (notesOp === 'hasTags') {
        filters.push(`notes:hasTags("${selectedNotes}")`);
      } else {
        filters.push(`notes:${notesOp}("${selectedNotes}")`);
      }
    }

    if (cleared !== null) {
      filters.push(`cleared:${cleared}`);
    }

    if (reconciled !== null) {
      filters.push(`reconciled:${reconciled}`);
    }

    if (transfer !== null) {
      filters.push(`transfer:${transfer}`);
    }

    // Handle date presets
    if (datePreset === 'thisMonth') {
      filters.push('date:thisMonth');
    } else if (datePreset === 'lastMonth') {
      filters.push('date:lastMonth');
    } else if (datePreset === 'thisYear') {
      filters.push('date:thisYear');
    } else if (datePreset === 'lastYear') {
      filters.push('date:lastYear');
    } else if (datePreset === 'custom') {
      if (startDate && endDate) {
        filters.push(`date:between("${startDate}","${endDate}")`);
      } else if (startDate) {
        filters.push(`date:gte("${startDate}")`);
      } else if (endDate) {
        filters.push(`date:lte("${endDate}")`);
      }
    }

    if (minAmount) {
      filters.push(`amount:gte(${parseFloat(minAmount) * 100})`);
    }

    if (maxAmount) {
      filters.push(`amount:lte(${parseFloat(maxAmount) * 100})`);
    }

    return filters.length > 0 ? `cost({${filters.join(',')}})` : '';
  };

  const isFormValid = () => {
    if (queryType === 'balance') {
      return selectedAccount.trim() !== '';
    }
    if (queryType === 'cost') {
      // At least one filter should be specified
      return (
        selectedCategory ||
        selectedAccount ||
        selectedPayee ||
        selectedNotes ||
        cleared !== null ||
        reconciled !== null ||
        transfer !== null ||
        minAmount ||
        maxAmount ||
        datePreset !== 'thisMonth'
      );
    }
    if (queryType === 'formula' || queryType === 'row-operation') {
      return customFormula.trim() !== '';
    }
    return true;
  };

  const handleSave = () => {
    if (!isFormValid()) {
      return;
    }

    const formula = generateFormula();
    console.log('QueryBuilder: Generated formula:', formula);

    if (queryType === 'balance') {
      console.log('QueryBuilder: Saving balance formula:', formula);
      onSave(formula);
    } else if (queryType === 'cost' && formula) {
      const queryMatch = formula.match(/\{([^}]*)\}/);
      const queryString = queryMatch ? queryMatch[1] : '';
      console.log('QueryBuilder: Saving cost query:', queryString);
      onSave(queryString);
    } else if (queryType === 'formula' || queryType === 'row-operation') {
      console.log('QueryBuilder: Saving custom formula:', formula);
      onSave(formula);
    }
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setQueryType('cost');
    setSelectedCategory('');
    setSelectedAccount('');
    setSelectedPayee('');
    setSelectedNotes('');
    setNotesOp('is');
    setCleared(null);
    setReconciled(null);
    setTransfer(null);
    setDatePreset('thisMonth');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setCustomFormula('');
    onClose();
  };

  const getQueryTypeDescription = () => {
    switch (queryType) {
      case 'cost':
        return t('Create queries to calculate transaction costs with filters');
      case 'balance':
        return t('Get the current balance of an account');
      case 'row-operation':
        return t(
          'Reference other rows using row-1, row-2, etc. (e.g., row-1 + row-2, sum(row-1:row-5))',
        );
      case 'formula':
        return t('Write custom formulas using functions and operations');
      default:
        return '';
    }
  };

  return (
    <Modal
      name="query-builder"
      isOpen={isOpen}
      onClose={handleClose}
      containerProps={{ style: { width: 550 } }}
    >
      <ModalHeader
        title={t('Query Builder')}
        rightContent={<ModalCloseButton onPress={handleClose} />}
      />

      <View style={{ padding: 15 }}>
        {/* Query Type Selection */}
        <FormField style={{ marginBottom: 15 }}>
          <FormLabel title={t('Query Type')} />
          <Select
            value={queryType}
            onChange={(value: QueryType) => setQueryType(value)}
            options={[
              ['cost', t('Transaction Cost')],
              ['balance', t('Account Balance')],
              ['row-operation', t('Row Reference')],
              ['formula', t('Custom Formula')],
            ]}
          />
          <Text
            style={{
              fontSize: 12,
              color: theme.pageTextSubdued,
              marginTop: 5,
              lineHeight: 1.4,
            }}
          >
            {getQueryTypeDescription()}
          </Text>
        </FormField>

        {/* Cost Query Form */}
        {queryType === 'cost' && (
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
                  value={getCategoryId(selectedCategory)} // Convert name back to ID for autocomplete
                  onSelect={categoryId => {
                    // Convert ID to name for storage
                    setSelectedCategory(getCategoryName(categoryId || ''));
                  }}
                  showHiddenCategories={true}
                />
              </FormField>

              <FormField>
                <FormLabel title={t('Account')} />
                <AccountAutocomplete
                  value={getAccountId(selectedAccount)} // Convert name back to ID for autocomplete
                  onSelect={accountId => {
                    // Convert ID to name for storage
                    setSelectedAccount(getAccountName(accountId || ''));
                  }}
                  includeClosedAccounts={false}
                />
              </FormField>
            </View>

            <FormField style={{ marginBottom: 15 }}>
              <FormLabel title={t('Payee')} />
              <PayeeAutocomplete
                value={getPayeeId(selectedPayee)} // Convert name back to ID for autocomplete
                onSelect={payeeId => {
                  // Convert ID to name for storage
                  setSelectedPayee(getPayeeName(payeeId || ''));
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
                  onChange={(value: string) => setNotesOp(value)}
                  options={[
                    ['is', t('is')],
                    ['contains', t('contains')],
                    ['hasTags', t('has tag(s)')],
                  ]}
                />
                <Input
                  value={selectedNotes}
                  onChange={e => setSelectedNotes(e.target.value)}
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
                    setCleared(value === '' ? null : value === 'true')
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
                    setReconciled(value === '' ? null : value === 'true')
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
                  setTransfer(value === '' ? null : value === 'true')
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
                onChange={(value: DatePreset) => setDatePreset(value)}
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
                    onSelect={setStartDate}
                    inputProps={{ placeholder: dateFormat.toLowerCase() }}
                  />
                </FormField>
                <FormField>
                  <FormLabel title={t('End Date')} />
                  <DateSelect
                    value={endDate}
                    dateFormat={dateFormat}
                    onSelect={setEndDate}
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
                  onChange={e => setMinAmount(e.target.value)}
                  placeholder={t('No minimum')}
                />
              </FormField>
              <FormField>
                <FormLabel title={t('Max Amount')} />
                <Input
                  type="number"
                  step="0.01"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  placeholder={t('No maximum')}
                />
              </FormField>
            </View>
          </>
        )}

        {/* Balance Query Form */}
        {queryType === 'balance' && (
          <>
            <Text
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: theme.pageText,
                marginBottom: 10,
              }}
            >
              {t('Account Selection')}
            </Text>

            <FormField>
              <FormLabel title={t('Account')} />
              <AccountAutocomplete
                value={getAccountId(selectedAccount)} // Convert name back to ID for autocomplete
                onSelect={accountId => {
                  // Convert ID to name for storage
                  setSelectedAccount(getAccountName(accountId || ''));
                }}
                includeClosedAccounts={false}
              />
            </FormField>
          </>
        )}

        {/* Row Operation and Custom Formula Form */}
        {(queryType === 'row-operation' || queryType === 'formula') && (
          <>
            <Text
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: theme.pageText,
                marginBottom: 10,
              }}
            >
              {queryType === 'row-operation'
                ? t('Row Reference')
                : t('Custom Formula')}
            </Text>

            <FormField style={{ marginBottom: 10 }}>
              <FormLabel title={t('Formula')} />
              <Input
                value={customFormula}
                onChange={e => setCustomFormula(e.target.value)}
                placeholder={
                  queryType === 'row-operation'
                    ? t('e.g., row-1 + row-2, row-2 - row-1, sum(row-1:row-5)')
                    : t(
                        'e.g., sum(row-1:row-5), if(row-1>0, row-1, 0), cost({ category:"Food" })',
                      )
                }
                style={{
                  fontFamily: 'var(--fl-code-font, monospace)',
                  fontSize: 13,
                }}
              />
            </FormField>

            {queryType === 'row-operation' && (
              <>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.pageText,
                    marginBottom: 8,
                  }}
                >
                  {t('Quick Helpers')}
                </Text>

                <View
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Button
                    variant="bare"
                    onPress={() => {
                      const currentFormula = customFormula;
                      const insertion = currentFormula ? ' + row-1' : 'row-1';
                      setCustomFormula(currentFormula + insertion);
                    }}
                    style={{
                      padding: '6px 8px',
                      fontSize: 11,
                      backgroundColor: theme.buttonBareBackground,
                      border: `1px solid ${theme.buttonMenuBorder}`,
                      borderRadius: 4,
                    }}
                  >
                    + row-1
                  </Button>

                  <Button
                    variant="bare"
                    onPress={() => {
                      const currentFormula = customFormula;
                      const insertion = currentFormula ? ' - row-1' : 'row-1';
                      setCustomFormula(currentFormula + insertion);
                    }}
                    style={{
                      padding: '6px 8px',
                      fontSize: 11,
                      backgroundColor: theme.buttonBareBackground,
                      border: `1px solid ${theme.buttonMenuBorder}`,
                      borderRadius: 4,
                    }}
                  >
                    - row-1
                  </Button>

                  <Button
                    variant="bare"
                    onPress={() => {
                      setCustomFormula('sum(row-1:row-5)');
                    }}
                    style={{
                      padding: '6px 8px',
                      fontSize: 11,
                      backgroundColor: theme.buttonBareBackground,
                      border: `1px solid ${theme.buttonMenuBorder}`,
                      borderRadius: 4,
                    }}
                  >
                    sum()
                  </Button>

                  <Button
                    variant="bare"
                    onPress={() => {
                      setCustomFormula('average(row-1:row-5)');
                    }}
                    style={{
                      padding: '6px 8px',
                      fontSize: 11,
                      backgroundColor: theme.buttonBareBackground,
                      border: `1px solid ${theme.buttonMenuBorder}`,
                      borderRadius: 4,
                    }}
                  >
                    avg()
                  </Button>

                  <Button
                    variant="bare"
                    onPress={() => {
                      setCustomFormula('if(row-1>0, row-1, 0)');
                    }}
                    style={{
                      padding: '6px 8px',
                      fontSize: 11,
                      backgroundColor: theme.buttonBareBackground,
                      border: `1px solid ${theme.buttonMenuBorder}`,
                      borderRadius: 4,
                    }}
                  >
                    if()
                  </Button>

                  <Button
                    variant="bare"
                    onPress={() => {
                      setCustomFormula('');
                    }}
                    style={{
                      padding: '6px 8px',
                      fontSize: 11,
                      backgroundColor: theme.buttonBareBackground,
                      border: `1px solid ${theme.buttonMenuBorder}`,
                      borderRadius: 4,
                    }}
                  >
                    <Trans>Clear</Trans>
                  </Button>
                </View>

                <View
                  style={{
                    marginBottom: 10,
                    padding: 8,
                    backgroundColor: theme.formInputBackground,
                    borderRadius: 4,
                    border: `1px solid ${theme.formInputBorder}`,
                  }}
                >
                  <Text
                    style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}
                  >
                    {t('Row References:')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: theme.pageTextSubdued,
                      lineHeight: 1.3,
                    }}
                  >
                    • row-1 = Row 1 value, row-2 = Row 2 value, etc.{'\n'}• Use
                    row-1:row-5 for ranges{'\n'}• Operations: +, -, *, /{'\n'}•
                    Functions: sum(), average(), min(), max(), count()
                  </Text>
                </View>
              </>
            )}

            <Text
              style={{
                fontSize: 11,
                color: theme.pageTextSubdued,
                lineHeight: 1.4,
              }}
            >
              {queryType === 'row-operation'
                ? t(
                    'Tip: Click the helper buttons above to quickly build common formulas',
                  )
                : t(
                    'Available: sum, average, min, max, count, if, cost, balance, abs, round, sqrt, today, and more',
                  )}
            </Text>
          </>
        )}

        {/* Formula Preview */}
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.pageText,
              marginBottom: 8,
            }}
          >
            {t('Formula Preview')}
          </Text>

          <View
            style={{
              fontFamily: 'var(--fl-code-font, monospace)',
              fontSize: 12,
              padding: 10,
              backgroundColor: theme.formInputBackground,
              border: `1px solid ${theme.formInputBorder}`,
              borderRadius: 4,
              color: generateFormula() ? theme.pageText : theme.pageTextSubdued,
              minHeight: 30,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {generateFormula() ||
              t('No formula generated - please fill in required fields')}
          </View>

          {!isFormValid() && (
            <Text
              style={{
                fontSize: 11,
                color: theme.errorText,
                marginTop: 5,
              }}
            >
              {queryType === 'balance' &&
                !selectedAccount &&
                t('Please select an account')}
              {queryType === 'cost' &&
                !selectedCategory &&
                !selectedAccount &&
                !selectedPayee &&
                !minAmount &&
                !maxAmount &&
                datePreset === 'thisMonth' &&
                t('Please specify at least one filter')}
              {(queryType === 'formula' || queryType === 'row-operation') &&
                !customFormula.trim() &&
                t('Please enter a formula')}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <Stack direction="row" justify="flex-end" style={{ gap: 10 }}>
          <Button onPress={handleClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            variant="primary"
            onPress={handleSave}
            isDisabled={!isFormValid()}
          >
            {t('Apply Formula')}
          </Button>
        </Stack>
      </View>
    </Modal>
  );
}
