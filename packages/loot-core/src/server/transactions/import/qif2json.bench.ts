import { bench, describe } from 'vitest';

import { qif2json } from './qif2json';

function generateQif(transactionCount: number): string {
  const lines = ['!Type:Bank'];
  for (let i = 0; i < transactionCount; i++) {
    const day = (i % 28) + 1;
    const month = (i % 12) + 1;
    lines.push(
      `D${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/18`,
      `T-${(i % 1000) + 0.99}`,
      `N${i}`,
      `PPayee Name ${i % 50}`,
      `MMemo for transaction ${i}`,
      `LCategory:Subcategory${i % 20}`,
      '^',
    );
  }
  return lines.join('\n');
}

const small = generateQif(100);
const large = generateQif(5000);

describe('qif2json', () => {
  bench('parse 100 transactions', () => {
    qif2json(small, { dateFormat: 'MM/dd/yy' });
  });

  bench('parse 5000 transactions', () => {
    qif2json(large, { dateFormat: 'MM/dd/yy' });
  });
});
