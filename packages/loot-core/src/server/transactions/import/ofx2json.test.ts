import { html2Plain, ofx2json } from './ofx2json';

describe('html2Plain', () => {
  test('regular text works', async () => {
    expect(html2Plain('Hello, world!')).toBe('Hello, world!');
    expect(html2Plain('Hello, <b>world</b>!')).toBe('Hello, <b>world</b>!');
  });

  test('brackets are unescaped', async () => {
    expect(html2Plain('Hello, &lt;world&gt;!')).toBe('Hello, <world>!');
  });
  test('apostrophes are unescaped', async () => {
    expect(html2Plain('Hello, &#39;world&#39;!')).toBe("Hello, 'world'!");
  });
  test('quotes are unescaped', async () => {
    expect(html2Plain('Hello, &quot;world&quot;!')).toBe('Hello, "world"!');
  });
  test('ampersands are unescaped', async () => {
    expect(html2Plain('Hello, &amp;world&amp;!')).toBe('Hello, &world&!');
    expect(html2Plain('Hello, &#038;world&#038;!')).toBe('Hello, &world&!');
  });
  test('no double unescaping with other entities', async () => {
    expect(html2Plain('Hello, &amp;#038;world&amp;#038;!')).toBe(
      'Hello, &#038;world&#038;!',
    );
    expect(html2Plain('Hello, &#038;amp;world&#038;amp;!')).toBe(
      'Hello, &amp;world&amp;!',
    );
    expect(html2Plain('Hello, &amp;quot;world&amp;quot;!')).toBe(
      'Hello, &quot;world&quot;!',
    );
  });
});

describe('ofx2json investment statements', () => {
  const investmentOfx = (cashTransactions: string[]) =>
    [
      'OFXHEADER:100',
      'DATA:OFXSGML',
      'VERSION:102',
      'ENCODING:USASCII',
      'CHARSET:1252',
      '',
      '<OFX><INVSTMTMSGSRSV1><INVSTMTTRNRS><TRNUID>0<INVSTMTRS><DTASOF>20260301<CURDEF>USD<INVTRANLIST><DTSTART>20260201<DTEND>20260301',
      ...cashTransactions.map(
        (trn, i) =>
          `<INVBANKTRAN><STMTTRN><TRNTYPE>${trn}<DTPOSTED>2026020${i + 1}120000<TRNAMT>${i + 1}0.00<FITID>fit-${i}<NAME>Cash ${i}</STMTTRN><SUBACCTFUND>CASH</INVBANKTRAN>`,
      ),
      '</INVTRANLIST></INVSTMTRS></INVSTMTTRNRS></INVSTMTMSGSRSV1></OFX>',
    ].join('\n');

  test('reads a statement with a single cash transaction', async () => {
    const { transactions } = await ofx2json(investmentOfx(['CREDIT']));
    expect(transactions).toMatchObject([
      { amount: '10.00', fitId: 'fit-0', name: 'Cash 0', date: '2026-02-01' },
    ]);
  });

  test('reads a statement with several cash transactions', async () => {
    const { transactions } = await ofx2json(investmentOfx(['CREDIT', 'DEBIT']));
    expect(transactions.map(t => t.fitId)).toEqual(['fit-0', 'fit-1']);
  });
});
