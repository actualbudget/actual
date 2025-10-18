import { useState, useEffect } from 'react';

import { useLocale } from './useLocale';

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
  const [result, setResult] = useState<number | string | boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hfInstance: unknown | null = null;
    let cancelled = false;

    async function executeFormula() {
      const { HyperFormula } = await import('hyperformula');

      if (!formula || !formula.startsWith('=')) {
        setResult(null);
        setError('Formula must start with =');
        return;
      }

      try {
        // Create HyperFormula instance
        hfInstance = HyperFormula.buildEmpty({
          licenseKey: 'gpl-v3',
          localeLang: typeof locale === 'string' ? locale : 'en-US',
        });

        const hfInstanceTyped = hfInstance as ReturnType<
          typeof HyperFormula.buildEmpty
        >;

        // Add a sheet
        const sheetName = hfInstanceTyped.addSheet('Sheet1');
        const sheetId = hfInstanceTyped.getSheetId(sheetName);

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
          if (value !== undefined && value !== null) {
            // Set the value in a cell
            hfInstanceTyped.setCellContents({ sheet: sheetId, col: 0, row }, [
              [value],
            ]);

            // Create a named range for this field
            hfInstanceTyped.addNamedExpression(
              key,
              `=Sheet1!$A$${row + 1}`, // +1 because HyperFormula uses 0-based rows but formulas use 1-based
            );

            row++;
          }
        }

        // Set the formula in row 0
        hfInstanceTyped.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [
          [formula],
        ]);

        // Get the result
        const cellValue = hfInstanceTyped.getCellValue({
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
      }
    }

    executeFormula();

    return () => {
      cancelled = true;
      // Clean up HF instance
      try {
        if (
          hfInstance &&
          typeof hfInstance === 'object' &&
          'destroy' in hfInstance
        ) {
          (hfInstance as { destroy: () => void }).destroy();
        }
      } catch {}
    };
  }, [formula, transaction, locale]);

  return { result, error };
}
