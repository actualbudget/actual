import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import { setCachedUserPreferences } from '@actual-app/core/shared/formulas/customFunctions';
import { HyperFormula } from 'hyperformula';

import { bootstrapHyperFormula } from '#util/bootstrapHyperFormula';

import { useGlobalPref } from './useGlobalPref';
import { useLocale } from './useLocale';

bootstrapHyperFormula();

type TransactionContext = {
  amount?: number;
  date?: string;
  notes?: string;
  imported_payee?: string;
  account?: string;
  category?: string;
  payee?: string;
  cleared?: boolean;
  reconciled?: boolean;
  [key: string]: string | number | boolean | undefined;
};

export function useTransactionFormulaExecution(
  formula: string,
  transaction: TransactionContext,
) {
  const locale = useLocale();
  const [language] = useGlobalPref('language');
  const [result, setResult] = useState<number | string | boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function executeFormula() {
      let hfInstance: ReturnType<typeof HyperFormula.buildEmpty> | null = null;

      if (!formula || !formula.startsWith('=')) {
        setResult(null);
        setError('Formula must start with =');
        return;
      }

      try {
        const browserLocale =
          typeof navigator === 'undefined' ? undefined : navigator.language;
        const formulaLocale = language || browserLocale || 'en-US';

        try {
          setCachedUserPreferences(
            await send('formula-load-user-preferences', {
              selectedLocale: language,
              browserLocale,
            }),
          );
        } catch (err) {
          console.error('Error loading formula preferences:', err);
        }

        // Create HyperFormula instance
        hfInstance = HyperFormula.buildEmpty({
          licenseKey: 'gpl-v3',
          language: 'enUS',
          localeLang: formulaLocale,
          dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD'],
          context: {
            // No server prefetch in preview
            balanceOfPrefetch: new Map(),
          },
        });

        // Add a sheet
        const sheetName = hfInstance.addSheet('Sheet1');
        const sheetId = hfInstance.getSheetId(sheetName);

        if (sheetId === undefined) {
          throw new Error('Failed to create sheet');
        }

        // Add named ranges for each transaction field
        let row = 1;
        const fieldValues: Record<string, number | string | boolean> = {
          today: new Date().toISOString().split('T')[0],
          ...transaction,
        };

        for (const [key, value] of Object.entries(fieldValues)) {
          if (
            value !== undefined &&
            value !== null &&
            typeof value !== 'object' &&
            !key.startsWith('_')
          ) {
            // Set the value in a cell
            hfInstance.setCellContents({ sheet: sheetId, col: 0, row }, [
              [value],
            ]);

            // Create a named range for this field
            hfInstance.addNamedExpression(
              key,
              `=Sheet1!$A$${row + 1}`, // +1 because HyperFormula uses 0-based rows but formulas use 1-based
            );

            row++;
          }
        }

        // Set the formula in row 0
        hfInstance.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [
          [formula],
        ]);

        // Get the result
        const cellValue = hfInstance.getCellValue({
          sheet: sheetId,
          col: 0,
          row: 0,
        });

        if (cancelled) return;

        // Check if there's an error
        if (cellValue && typeof cellValue === 'object' && 'type' in cellValue) {
          setError(`Formula error: ${cellValue.type}`);
          setResult(null);
        } else {
          setResult(cellValue as number | string | boolean);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Formula execution error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setResult(null);
      } finally {
        try {
          hfInstance?.destroy();
        } catch (err) {
          console.error('Error destroying HyperFormula instance:', err);
          setError('Error destroying HyperFormula instance');
          setResult(null);
        }
      }
    }

    void executeFormula();

    return () => {
      cancelled = true;
    };
  }, [formula, transaction, locale, language]);

  return { result, error };
}
