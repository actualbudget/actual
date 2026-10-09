import { xmlCAMT2json } from './xmlcamt2json';

it.each(['invalid', '', 'Infinity'])(
  'skips invalid debit amounts instead of importing zero (%s)',
  async amount => {
    const xml = `<Document><Ntry><Amt Ccy="EUR">${amount}</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-10-09</Dt></BookgDt></Ntry></Document>`;
    expect(await xmlCAMT2json(xml)).toEqual([]);
  },
);

it('keeps zero and valid debit amounts', async () => {
  const xml = `<Document>${['0', '12.3'].map(amount => `<Ntry><Amt Ccy="EUR">${amount}</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-10-09</Dt></BookgDt></Ntry>`).join('')}</Document>`;
  expect(
    (await xmlCAMT2json(xml)).map(transaction => transaction.amount),
  ).toEqual([-0, -12.3]);
});
