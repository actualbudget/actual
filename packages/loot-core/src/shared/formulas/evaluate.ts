import { HyperFormula } from 'hyperformula';
import enUS from 'hyperformula/i18n/languages/enUS';

import {
  CustomFunctionsPlugin,
  customFunctionsTranslations,
} from './customFunctions';

export type FormulaCellValue = number | string | boolean | null;

// Carries the underlying HyperFormula error type (e.g. 'ERROR' for parse/syntax
// failures, 'DIV_BY_ZERO', 'NAME', … for evaluation failures) so callers can
// distinguish an incomplete/invalid formula from a genuine evaluation error.
export class FormulaEvaluationError extends Error {
  formulaErrorType: string;

  constructor(formulaErrorType: string, message: string) {
    super(message);
    this.name = 'FormulaEvaluationError';
    this.formulaErrorType = formulaErrorType;
  }
}

type EvaluateOptions = {
  balanceOfPrefetch?: Map<string, number>;
};

let bootstrapped = false;

function bootstrap() {
  if (bootstrapped) return;
  if (!HyperFormula.getRegisteredLanguagesCodes().includes('enUS')) {
    HyperFormula.registerLanguage('enUS', enUS);
  }
  if (!HyperFormula.getRegisteredFunctionNames('enUS').includes('BALANCE_OF')) {
    HyperFormula.registerFunctionPlugin(
      CustomFunctionsPlugin,
      customFunctionsTranslations,
    );
  }
  bootstrapped = true;
}

/**
 * Evaluates an Excel-style formula (starting with `=`) against named
 * expressions. Returns the raw cell value: numbers are in the formula's own
 * units (major units for amounts written as numbers; see the conversion
 * helpers in the callers), strings/dates are returned as strings.
 *
 * This module intentionally has no platform imports so it can be used from
 * shared code, the desktop UI (live previews) and the server alike.
 */
export function evaluateFormula(
  formula: string,
  namedExpressions: Record<string, unknown>,
  options: EvaluateOptions = {},
): FormulaCellValue {
  if (!formula || !formula.startsWith('=')) {
    throw new Error('Formula must start with =');
  }

  bootstrap();

  let hfInstance: ReturnType<typeof HyperFormula.buildEmpty> | null = null;

  try {
    hfInstance = HyperFormula.buildEmpty({
      licenseKey: 'gpl-v3',
      language: 'enUS',
      dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD'],
      context: {
        balanceOfPrefetch: options.balanceOfPrefetch ?? new Map(),
      },
    });

    const sheetName = hfInstance.addSheet('Sheet1');
    const sheetId = hfInstance.getSheetId(sheetName);

    if (sheetId === undefined) {
      throw new Error('Failed to create sheet');
    }

    for (const [name, raw] of Object.entries(namedExpressions)) {
      let value: string | number | boolean;
      if (
        typeof raw === 'string' ||
        typeof raw === 'number' ||
        typeof raw === 'boolean'
      ) {
        value = raw;
      } else {
        value = '';
      }
      hfInstance.addNamedExpression(name, value);
    }

    hfInstance.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [[formula]]);

    const cellValue = hfInstance.getCellValue({
      sheet: sheetId,
      col: 0,
      row: 0,
    });

    if (cellValue && typeof cellValue === 'object' && 'type' in cellValue) {
      const error = cellValue as { type: string; message?: string };
      throw new FormulaEvaluationError(
        error.type,
        `Formula error: ${error.message ?? error.type}`,
      );
    }

    return cellValue as FormulaCellValue;
  } finally {
    try {
      hfInstance?.destroy();
    } catch {
      // Best-effort cleanup; nothing useful we can do if destruction fails.
    }
  }
}
