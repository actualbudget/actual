// @ts-strict-ignore
import { handlers } from '../main';

import { importActual } from './actual';
import * as YNAB4 from './ynab4';
import * as YNAB5 from './ynab5';

export type ImportableBudgetType = 'ynab4' | 'ynab5' | 'actual';

type Importer = {
  parseFile(buffer: Buffer): unknown;
  getBudgetName(filepath: string, data: unknown): string | null;
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
    try {
      data = importer.parseFile(buffer);
      budgetName = importer.getBudgetName(filepath, data);
    } catch (e) {
      console.error('failed to parse file', e);
    }
    if (!budgetName) {
      return { error: 'not-' + type };
    }

    try {
      await handlers['api/start-import']({ budgetName });
    } catch (e) {
      console.error('failed to start import', e);
      return { error: 'unknown' };
    }
    await importer.doImport(data);
  } catch (e) {
    await handlers['api/abort-import']();
    console.error('failed to run import', e);
    return { error: 'unknown' };
  }

  await handlers['api/finish-import']();
}
