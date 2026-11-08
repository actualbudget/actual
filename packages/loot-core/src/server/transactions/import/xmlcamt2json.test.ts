import { xmlCAMT2json } from './xmlcamt2json';

function camt(entries: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt><Stmt><Id>1</Id>${entries}</Stmt></BkToCstmrStmt>
</Document>`;
}

function entry({
  amount,
  indicator,
  details = '',
  info = '',
}: {
  amount: string;
  indicator: 'CRDT' | 'DBIT';
  details?: string;
  info?: string;
}) {
  return `<Ntry>
    <Amt Ccy="EUR">${amount}</Amt>
    <CdtDbtInd>${indicator}</CdtDbtInd>
    <BookgDt><Dt>2026-03-02</Dt></BookgDt>
    ${info ? `<AddtlNtryInf>${info}</AddtlNtryInf>` : ''}
    ${details ? `<NtryDtls>${details}</NtryDtls>` : ''}
  </Ntry>`;
}

function txDtls(name: string, amount?: string) {
  return `<TxDtls>
    ${amount ? `<AmtDtls><TxAmt><Amt Ccy="EUR">${amount}</Amt></TxAmt></AmtDtls>` : ''}
    <RltdPties><Cdtr><Nm>${name}</Nm></Cdtr></RltdPties>
    <RmtInf><Ustrd>Invoice ${name}</Ustrd></RmtInf>
  </TxDtls>`;
}

describe('xmlCAMT2json batch entries', () => {
  test('imports a batch whose details have no amounts as one transaction', async () => {
    const transactions = await xmlCAMT2json(
      camt(
        entry({
          amount: '150.00',
          indicator: 'DBIT',
          info: 'Batch payment',
          details: txDtls('Alice') + txDtls('Bob'),
        }),
      ),
    );

    expect(transactions).toEqual([
      {
        amount: -150,
        date: '2026-03-02',
        payee_name: 'Batch payment',
        imported_payee: 'Batch payment',
        notes: null,
      },
    ]);
  });

  test('still splits a batch whose details carry their own amounts', async () => {
    const transactions = await xmlCAMT2json(
      camt(
        entry({
          amount: '150.00',
          indicator: 'DBIT',
          details: txDtls('Alice', '100.00') + txDtls('Bob', '50.00'),
        }),
      ),
    );

    expect(transactions.map(t => [t.payee_name, t.amount, t.notes])).toEqual([
      ['Alice', -100, 'Invoice Alice'],
      ['Bob', -50, 'Invoice Bob'],
    ]);
  });

  test('skips a detail without an amount instead of importing it as zero', async () => {
    const transactions = await xmlCAMT2json(
      camt(
        entry({
          amount: '100.00',
          indicator: 'DBIT',
          details: txDtls('Alice', '100.00') + txDtls('Bob'),
        }),
      ),
    );

    expect(transactions.map(t => [t.payee_name, t.amount])).toEqual([
      ['Alice', -100],
    ]);
  });

  test('skips a debit entry with an unreadable amount', async () => {
    const transactions = await xmlCAMT2json(
      camt(entry({ amount: 'n/a', indicator: 'DBIT', info: 'Fee' })),
    );

    expect(transactions).toEqual([]);
  });
});
