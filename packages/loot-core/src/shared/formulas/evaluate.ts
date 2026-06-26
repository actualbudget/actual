import { HyperFormula } from 'hyperformula';
import enUS from 'hyperformula/i18n/languages/enUS';

import { logger } from '#platform/server/log';
import {
  CustomFunctionsPlugin,
  customFunctionsTranslations,
} from '#shared/formulas/customFunctions';

export type FormulaCellValue = number | string | boolean | null;

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
      throw new Error(`Formula error: ${error.message ?? error.type}`);
    }

    return cellValue as FormulaCellValue;
  } finally {
    try {
      hfInstance?.destroy();
    } catch (err) {
      logger.error('Error destroying HyperFormula instance:', err);
    }
  }
}
