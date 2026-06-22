import { bench, describe } from 'vitest';

import { xmlCAMT2json } from './xmlcamt2json';

function generateEntry(i: number): string {
  const day = String((i % 28) + 1).padStart(2, '0');
  const isDebit = i % 2 === 0;
  return `
            <Ntry>
                <Amt Ccy="EUR">${(i % 1000) + 0.6}</Amt>
                <CdtDbtInd>${isDebit ? 'DBIT' : 'CRDT'}</CdtDbtInd>
                <Sts>BOOK</Sts>
                <BookgDt>
                    <Dt>2014-01-${day}</Dt>
                </BookgDt>
                <ValDt>
                    <Dt>2014-01-${day}</Dt>
                </ValDt>
                <AcctSvcrRef>2013123001153870${String(i).padStart(3, '0')}</AcctSvcrRef>
                <NtryDtls>
                    <TxDtls>
                        <Refs>
                            <EndToEndId>STZV-EtE-${i}</EndToEndId>
                        </Refs>
                        <RltdPties>
                            <Dbtr>
                                <Nm>Debtor ${i % 50}</Nm>
                            </Dbtr>
                            <Cdtr>
                                <Nm>Creditor ${i % 50}</Nm>
                            </Cdtr>
                        </RltdPties>
                        <RmtInf>
                            <Ustrd>Payment reference for transaction ${i}</Ustrd>
                        </RmtInf>
                    </TxDtls>
                </NtryDtls>
            </Ntry>`;
}

function generateCamt(transactionCount: number): string {
  const entries: string[] = [];
  for (let i = 0; i < transactionCount; i++) {
    entries.push(generateEntry(i));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document
    xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.04"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <BkToCstmrStmt>
        <GrpHdr>
            <MsgId>053D2014</MsgId>
            <CreDtTm>2014-01-03T22:01:36.0+01:00</CreDtTm>
        </GrpHdr>
        <Stmt>
            <Id>0352C5320140103220142</Id>
            <Acct>
                <Id>
                    <IBAN>DE14740618130000033626</IBAN>
                </Id>
                <Ccy>EUR</Ccy>
            </Acct>
            ${entries.join('')}
        </Stmt>
    </BkToCstmrStmt>
</Document>`;
}

const small = generateCamt(100);
const large = generateCamt(2000);

describe('xmlCAMT2json', () => {
  bench('parse 100 transactions', async () => {
    await xmlCAMT2json(small);
  });

  bench('parse 2000 transactions', async () => {
    await xmlCAMT2json(large);
  });
});
