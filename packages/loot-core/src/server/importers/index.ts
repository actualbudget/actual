import importActual from './actual';
import importYNAB4 from './ynab4';
import importYNAB5 from './ynab5';

type ImportableBudgetType = 'ynab4' | 'ynab5' | 'actual';

export async function handleBudgetImport(
  type: ImportableBudgetType,
  filepath: string,
  buffer: Buffer,
) {
  switch (type) {
    case 'ynab4':
      try {
        await importYNAB4(filepath, buffer);
      } catch (e) {
        let msg = e.message.toLowerCase();
        if (
          msg.includes('not a ynab4') ||
          msg.includes('could not find file')
        ) {
          return { error: 'not-ynab4' };
        }
      }
      break;
    case 'ynab5':
      try {
        let result = await importYNAB5(filepath, buffer);
        if (result) {
          return result;
        }
      } catch (e) {
        return { error: 'not-ynab5' };
      }
      break;
    case 'actual':
      await importActual(filepath, buffer);
      break;
    default:
  }
}
