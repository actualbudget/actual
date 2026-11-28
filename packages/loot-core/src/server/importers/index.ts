// @ts-strict-ignore
import { logger } from '#platform/server/log';
import { handlers } from '#server/main';
import { importedCurrencyCode } from '#shared/amount-encoding';

import { importActual } from './actual';
import * as YNAB4 from './ynab4';
import * as YNAB5 from './ynab5';

export type ImportableBudgetType = 'ynab4' | 'ynab5' | 'actual';

type Importer = {
  parseFile(buffer: Buffer): unknown;
  getBudgetName(filepath: string, data: unknown): string | null;
  getCurrencyCode(data: unknown): string;
  doImport(data: unknown): Promise<void>;
};

const importers: Record<Exclude<ImportableBudgetType, 'actual'>, Importer> = {
  ynab4: YNAB4,
  ynab5: YNAB5,
};

export async function handleBudgetImport(
  type: ImportableBudgetType,
  filepath: string,
  buffer: Buffer,
) {
  if (type === 'actual') {
    return importActual(filepath, buffer);
  }
  const importer = importers[type];
  try {
    let data;
    let budgetName: string;
    let currencyCode: string;
    try {
      data = importer.parseFile(buffer);
      budgetName = importer.getBudgetName(filepath, data);
    } catch (e) {
      logger.error('failed to parse file', e);
      return { error: 'not-' + type };
    }
    if (!budgetName) {
      return { error: 'not-' + type };
    }

    try {
      const sourceCurrencyCode = importer.getCurrencyCode(data);
      currencyCode = importedCurrencyCode(sourceCurrencyCode);
      if (sourceCurrencyCode && !currencyCode) {
        logger.warn(
          `Importing unreviewed currency ${sourceCurrencyCode} without a currency at 2 decimal places`,
        );
      }
    } catch (e) {
      logger.error('failed to read import currency', e);
      return { error: 'unknown' };
    }

    try {
      await handlers['api/start-import']({
        budgetName,
        currencyCode,
      });
    } catch (e) {
      logger.error('failed to start import', e);
      return { error: 'unknown' };
    }
    await importer.doImport(data);
  } catch (e) {
    await handlers['api/abort-import']();
    logger.error('failed to run import', e);
    return { error: 'unknown' };
  }

  await handlers['api/finish-import']();
}
