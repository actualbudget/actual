/* eslint-disable actual/typography */
import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Stack } from '@actual-app/components/stack';
import { View } from '@actual-app/components/view';

import { parseQueryParams } from './queryParser';
import { hasSelfReference } from './useSheetCalculation';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { BalanceQueryForm } from '@desktop-client/components/reports/reports/spreadsheetReport/BalanceQueryForm';
import { CostQueryForm } from '@desktop-client/components/reports/reports/spreadsheetReport/CostQueryForm';
import { FormulaPreview } from '@desktop-client/components/reports/reports/spreadsheetReport/FormulaPreview';
import { FormulaQueryForm } from '@desktop-client/components/reports/reports/spreadsheetReport/FormulaQueryForm';
import { QueryTypeSelector } from '@desktop-client/components/reports/reports/spreadsheetReport/QueryTypeSelector';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { usePayees } from '@desktop-client/hooks/usePayees';

type QueryBuilderProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (query: string) => void;
  existingFormula?: string;
  currentRowRef?: string; // Add current row reference for validation
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

// Helper function for safe regex matching with timeout
function safeRegexMatch(
  input: string,
  regex: RegExp,
  timeoutMs: number = 100,
): RegExpMatchArray | null {
  try {
    // Input validation to prevent ReDoS attacks
    if (!input || typeof input !== 'string') {
      return null;
    }

    // Limit input length to prevent excessive processing
    if (input.length > 1000) {
      console.warn('QueryBuilder: Input too long for regex matching');
      return null;
    }

    // Check for potentially dangerous regex patterns and input combinations
    const regexSource = regex.source;

    // For patterns with unbounded quantifiers, apply stricter limits
    if (regexSource.includes('.*') || regexSource.includes('.+')) {
      if (input.length > 100) {
        console.warn(
          'QueryBuilder: Input too long for unbounded regex pattern',
        );
        return null;
      }

      // Additional check for catastrophic backtracking patterns
      if (
        regexSource.includes('.*.*') ||
        regexSource.includes('.+.*') ||
        regexSource.includes('.*.+')
      ) {
        if (input.length > 50) {
          console.warn(
            'QueryBuilder: Input too long for nested unbounded pattern',
          );
          return null;
        }
      }
    }

    // Check for nested quantifiers that can cause exponential backtracking
    if (
      regexSource.includes('(.*)*') ||
      regexSource.includes('(.+)*') ||
      regexSource.includes('(.*)+')
    ) {
      if (input.length > 50) {
        console.warn(
          'QueryBuilder: Input too long for nested quantifier pattern',
        );
        return null;
      }
    }

    // For synchronous safety, use a more conservative approach
    // Set a maximum execution time and use Date.now() to check
    const startTime = Date.now();
    const result = input.match(regex);
    const endTime = Date.now();

    if (endTime - startTime > timeoutMs) {
      console.warn('QueryBuilder: Regex operation took too long, aborting');
      return null;
    }

    return result;
  } catch (error) {
    console.warn('QueryBuilder: Regex operation failed:', error);
    return null;
  }
}

// Helper function for safe regex testing with timeout
function safeRegexTest(
  input: string,
  regex: RegExp,
  timeoutMs: number = 100,
): boolean {
  try {
    // Input validation to prevent ReDoS attacks
    if (!input || typeof input !== 'string') {
      return false;
    }

    // Limit input length to prevent excessive processing
    if (input.length > 1000) {
      console.warn('QueryBuilder: Input too long for regex testing');
      return false;
    }

    // Check for potentially dangerous regex patterns and input combinations
    const regexSource = regex.source;

    // For patterns with unbounded quantifiers, apply stricter limits
    if (regexSource.includes('.*') || regexSource.includes('.+')) {
      if (input.length > 100) {
        console.warn(
          'QueryBuilder: Input too long for unbounded regex pattern',
        );
        return false;
      }

      // Additional check for catastrophic backtracking patterns
      if (
        regexSource.includes('.*.*') ||
        regexSource.includes('.+.*') ||
        regexSource.includes('.*.+')
      ) {
        if (input.length > 50) {
          console.warn(
            'QueryBuilder: Input too long for nested unbounded pattern',
          );
          return false;
        }
      }
    }

    // Check for nested quantifiers that can cause exponential backtracking
    if (
      regexSource.includes('(.*)*') ||
      regexSource.includes('(.+)*') ||
      regexSource.includes('(.*)+')
    ) {
      if (input.length > 50) {
        console.warn(
          'QueryBuilder: Input too long for nested quantifier pattern',
        );
        return false;
      }
    }

    // For synchronous safety, use a more conservative approach
    // Set a maximum execution time and use Date.now() to check
    const startTime = Date.now();
    const result = regex.test(input);
    const endTime = Date.now();

    if (endTime - startTime > timeoutMs) {
      console.warn(
        'QueryBuilder: Regex test operation took too long, aborting',
      );
      return false;
    }

    return result;
  } catch (error) {
    console.warn('QueryBuilder: Regex test operation failed:', error);
    return false;
  }
}

// Function to parse existing formula and extract query parameters
function parseFormulaToQueryParams(formula: string): ParsedParams {
  if (!formula) return { queryType: 'cost' };

  // Input validation to prevent DoS attacks
  if (formula.length > 10000) {
    console.warn('QueryBuilder: Formula too long, truncating');
    formula = formula.substring(0, 10000);
  }

  const params: ParsedParams = { queryType: 'cost' };

  // Determine query type based on formula content
  if (formula.includes('cost(')) {
    params.queryType = 'cost';
  } else if (formula.includes('balance(')) {
    params.queryType = 'balance';
  } else if (
    safeRegexTest(formula.trim(), /^row-\d+[+\-*/]row-\d+/) ||
    safeRegexTest(formula.trim(), /^row-\d+$/)
  ) {
    params.queryType = 'row-operation';
  } else {
    params.queryType = 'formula';
  }

  // Remove leading = and extract content between { } for cost queries
  const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;
  const queryMatch = safeRegexMatch(cleanFormula, /\{([^}]*)\}/);

  if (queryMatch) {
    const queryString = queryMatch[1];

    // Use shared utility to parse query parameters
    const parsedParams = parseQueryParams(queryString);

    // Copy parsed parameters to our local params object
    params.category = parsedParams.category;
    params.account = parsedParams.account;
    params.payee = parsedParams.payee;
    params.notes = parsedParams.notes;
    params.notesOp = parsedParams.notesOp;
    params.cleared = parsedParams.cleared;
    params.reconciled = parsedParams.reconciled;
    params.transfer = parsedParams.transfer;
    params.datePreset = parsedParams.datePreset;
    params.startDate = parsedParams.startDate;
    params.endDate = parsedParams.endDate;
    params.minAmount = parsedParams.minAmount;
    params.maxAmount = parsedParams.maxAmount;
  }

  // Parse balance queries
  if (params.queryType === 'balance') {
    const balanceMatch = safeRegexMatch(
      cleanFormula,
      /balance\(\s*"([^"]+)"\s*\)/,
    );
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
  currentRowRef,
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
      return !!(
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
      // Check for self-reference
      if (currentRowRef && hasSelfReference(customFormula, currentRowRef)) {
        return false;
      }
      return customFormula.trim() !== '';
    }
    return true;
  };

  const handleSave = () => {
    if (!isFormValid()) {
      return;
    }

    const formula = generateFormula();

    if (queryType === 'balance') {
      onSave(formula);
    } else if (queryType === 'cost' && formula) {
      const queryMatch = safeRegexMatch(formula, /\{([^}]*)\}/);
      const queryString = queryMatch ? queryMatch[1] : '';
      onSave(queryString);
    } else if (queryType === 'formula' || queryType === 'row-operation') {
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
        <QueryTypeSelector
          queryType={queryType}
          onQueryTypeChange={setQueryType}
          getQueryTypeDescription={getQueryTypeDescription}
        />

        {/* Cost Query Form */}
        {queryType === 'cost' && (
          <CostQueryForm
            selectedCategory={selectedCategory}
            selectedAccount={selectedAccount}
            selectedPayee={selectedPayee}
            notesOp={notesOp}
            selectedNotes={selectedNotes}
            cleared={cleared}
            reconciled={reconciled}
            transfer={transfer}
            datePreset={datePreset}
            startDate={startDate}
            endDate={endDate}
            minAmount={minAmount}
            maxAmount={maxAmount}
            dateFormat={dateFormat}
            onCategoryChange={setSelectedCategory}
            onAccountChange={setSelectedAccount}
            onPayeeChange={setSelectedPayee}
            onNotesOpChange={setNotesOp}
            onNotesChange={setSelectedNotes}
            onClearedChange={setCleared}
            onReconciledChange={setReconciled}
            onTransferChange={setTransfer}
            onDatePresetChange={setDatePreset}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onMinAmountChange={setMinAmount}
            onMaxAmountChange={setMaxAmount}
            getCategoryId={getCategoryId}
            getAccountId={getAccountId}
            getPayeeId={getPayeeId}
            getCategoryName={getCategoryName}
            getAccountName={getAccountName}
            getPayeeName={getPayeeName}
          />
        )}

        {/* Balance Query Form */}
        {queryType === 'balance' && (
          <BalanceQueryForm
            selectedAccount={selectedAccount}
            onAccountChange={setSelectedAccount}
            getAccountId={getAccountId}
            getAccountName={getAccountName}
          />
        )}

        {/* Formula Query Form */}
        {(queryType === 'row-operation' || queryType === 'formula') && (
          <FormulaQueryForm
            queryType={queryType}
            customFormula={customFormula}
            onFormulaChange={setCustomFormula}
            currentRowRef={currentRowRef}
          />
        )}

        {/* Formula Preview */}
        <FormulaPreview
          queryType={queryType}
          selectedAccount={selectedAccount}
          selectedCategory={selectedCategory}
          selectedPayee={selectedPayee}
          selectedNotes={selectedNotes}
          cleared={cleared}
          reconciled={reconciled}
          transfer={transfer}
          minAmount={minAmount}
          maxAmount={maxAmount}
          datePreset={datePreset}
          customFormula={customFormula}
          generateFormula={generateFormula}
          isFormValid={isFormValid}
        />

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
