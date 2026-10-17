import CommerzbankCobadeff from '#app-gocardless/banks/commerzbank_cobadeff';

describe('CommerzbankCobadeff', () => {
  describe('#normalizeTransaction', () => {
    it('correctly formats remittanceInformationUnstructured', () => {
      const transaction = {
        endToEndId: '1234567890',
        mandateId: '321654',
        bookingDate: '2024-12-20',
        valueDate: '2024-12-20',
        transactionAmount: {
          amount: '-12.34',
          currency: 'EUR',
        },
        creditorName: 'SHOP NAME CITY DE',
        remittanceInformationUnstructured:
          'SHOP NAME//CITY/DE\n2024-12-19T15:34:31 KFN 1  AB 1234\nKartenzahlung',
        remittanceInformationUnstructuredArray: [
          'SHOP NAME//CITY/DE',
          '2024-12-19T15:34:31 KFN 1 AB 1234',
          'Kartenzahlung',
        ],
        remittanceInformationStructured:
          'SHOP NAME//CITY/DE 2024-12-19T15:34:31 KFN 1 AB 1234 Kartenzahlung',
        internalTransactionId: '3815213adb654baeadfb231c853',
      };
      const normalizedTransaction = CommerzbankCobadeff.normalizeTransaction(
        transaction,
        false,
      );
      expect(normalizedTransaction?.notes).toEqual(
        '2024-12-19T15:34:31 KFN 1 AB 1234, Kartenzahlung',
      );
    });

    it('correctly formats remittanceInformationUnstructured; repair split keyword', () => {
      const transaction = {
        endToEndId: '901234567890',
        mandateId: 'ABC123DEF456',
        bookingDate: '2024-10-11',
        valueDate: '2024-10-11',
        transactionAmount: {
          amount: '-56.78',
          currency: 'EUR',
        },
        creditorName: 'Long payee name that is eaxtly 35ch',
        remittanceInformationUnstructured:
          'Long payee name that is eaxtly 35ch\n901234567890/. Long description tha\nt gets cut and is very long, did I\nmention it is long\nEnd-to-En',
        remittanceInformationUnstructuredArray: [
          'Long payee name that is eaxtly 35ch',
          '901234567890/. Long description tha',
          't gets cut and is very long, did I',
          'mention it is long',
          'End-to-En',
          'd-Ref.: 901234567890',
          'Mandatsref: ABC123DEF456',
          'Gläubiger-ID:',
          'AB12CDE0000000000000000012',
          'SEPA-BASISLASTSCHRIFT wiederholend',
        ],
        remittanceInformationStructured:
          'Long payee name that is eaxtly 35ch 901234567890/. Long description tha t gets cut and is very long, did I mention it is long End-to-En',
        internalTransactionId: '812354cfdea36465asdfe',
      };
      const normalizedTransaction = CommerzbankCobadeff.normalizeTransaction(
        transaction,
        false,
      );
      expect(normalizedTransaction?.notes).toEqual(
        '901234567890/. Long description tha t gets cut and is very long, did I mention it is long, End-to-End-Ref.: 901234567890, Mandatsref: ABC123DEF456, Gläubiger-ID: AB12CDE0000000000000000012, SEPA-BASISLASTSCHRIFT wiederholend',
      );
    });

    it('correctly formats remittanceInformationUnstructured; removing NOTPROVIDED', () => {
      const transaction = {
        endToEndId: 'NOTPROVIDED',
        bookingDate: '2024-12-02',
        valueDate: '2024-12-02',
        transactionAmount: {
          amount: '-9',
          currency: 'EUR',
        },
        creditorName: 'CREDITOR NAME',
        creditorAccount: {
          iban: 'CREDITOR000IBAN',
        },
        remittanceInformationUnstructured:
          'CREDITOR NAME\nCREDITOR00BIC\nCREDITOR000IBAN\nDESCRIPTION\nEnd-to-End-Ref.: NOTPROVIDED\nDauerauftrag',
        remittanceInformationUnstructuredArray: [
          'CREDITOR NAME',
          'CREDITOR00BIC',
          'CREDITOR000IBAN',
          'DESCRIPTION',
          'End-to-End-Ref.: NOTPROVIDED',
          'Dauerauftrag',
        ],
        remittanceInformationStructured:
          'CREDITOR NAME CREDITOR00BIC CREDITOR000IBAN DESCRIPTION End-to-End-Ref.: NOTPROVIDED Dauerauftrag',
        internalTransactionId: 'f617dc31ab77622bf13d6c95d6dd8b4a',
      };
      const normalizedTransaction = CommerzbankCobadeff.normalizeTransaction(
        transaction,
        false,
      );
      expect(normalizedTransaction?.notes).toEqual(
        'CREDITOR00BIC CREDITOR000IBAN DESCRIPTION, Dauerauftrag',
      );
    });

    it('correctly uses regex on payee with special characters', () => {
      const transaction = {
        endToEndId: '1234567890',
        mandateId: '1234567890',
        bookingDate: '2025-04-18',
        valueDate: '2025-04-18',
        transactionAmount: {
          amount: '-1',
          currency: 'EUR',
        },
        creditorName: 'Netto Marken-Discount Halle (Saale',
        remittanceInformationUnstructured: 'Example',
        remittanceInformationUnstructuredArray: ['Example'],
        remittanceInformationStructured: 'Example',
        // internalTransactionId: '3815213adb654baeadfb231c853',
      };
      const normalizedTransaction = CommerzbankCobadeff.normalizeTransaction(
        transaction,
        false,
      );
      expect(normalizedTransaction?.notes).toEqual('Example');
    });
  });
});

describe('hostile payee names', () => {
  it('handles the reported multi-word payload and slash-heavy near misses within a hard process deadline', async () => {
    const { execFileSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const cases = [
      { name: ' '.repeat(100), notes: 'Ordinary note' },
      { name: 'A' + ' '.repeat(24) + 'B', notes: 'A' + '/'.repeat(48) + 'C' },
      { name: 'A / B', notes: 'A' + '/'.repeat(10000) + 'C' },
      { name: 'A (B)', notes: 'A///(B) reference' },
    ];
    const input = cases.map(({ name, notes }) => ({
      creditorName: name,
      transactionAmount: { amount: '-1', currency: 'EUR' },
      bookingDate: '2026-09-27',
      remittanceInformationUnstructuredArray: [notes],
    }));
    const output = execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL('./fixtures/commerzbank-hostile.mjs', import.meta.url),
        ),
      ],
      {
        input: JSON.stringify(input),
        timeout: 20000,
        encoding: 'utf8',
      },
    );
    expect(JSON.parse(output)).toEqual([
      cases[0].notes,
      cases[1].notes,
      cases[2].notes,
      'reference',
    ]);
  }, 30000);
});
