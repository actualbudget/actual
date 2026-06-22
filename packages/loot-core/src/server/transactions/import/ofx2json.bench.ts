import { bench, describe } from 'vitest';

import { ofx2json } from './ofx2json';

function generateOfx(transactionCount: number): string {
  const header = [
    'OFXHEADER:100',
    'DATA:OFXSGML',
    'VERSION:102',
    'SECURITY:NONE',
    'ENCODING:USASCII',
    'CHARSET:1252',
    'COMPRESSION:NONE',
    'OLDFILEUID:NONE',
    'NEWFILEUID:NONE',
    '',
  ].join('\n');

  const transactions: string[] = [];
  for (let i = 0; i < transactionCount; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    transactions.push(
      '<STMTTRN>',
      '<TRNTYPE>DEBIT',
      `<DTPOSTED>201801${day}120000`,
      `<TRNAMT>-${(i % 1000) + 0.99}`,
      `<FITID>${i}`,
      `<NAME>Payee Name ${i % 50}`,
      `<MEMO>Memo for transaction ${i}`,
      '</STMTTRN>',
    );
  }

  return `${header}
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD
<BANKTRANLIST>
<DTSTART>20180101120000
<DTEND>20181231120000
${transactions.join('\n')}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
}

const small = generateOfx(100);
const large = generateOfx(2000);

describe('ofx2json', () => {
  bench('parse 100 transactions', async () => {
    await ofx2json(small);
  });

  bench('parse 2000 transactions', async () => {
    await ofx2json(large);
  });
});
