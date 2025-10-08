import BoursoBank from '../boursobank_bousfrppxxx.js';

describe('BoursoBank', () => {
  describe('#normalizeTransaction', () => {
    it.each([
      [['CARTE 01/03/25 PAYEE NAME CB*4567'], 'Payee Name', 'Carte 01/03/25'],
      [
        ['CARTE 01/03/25 PAYEE NAME 713621 CB*4567'],
        'Payee Name',
        'Carte 01/03/25',
      ],
      [['CARTE 01/03/25 PAYEE NAME'], 'Payee Name', 'Carte 01/03/25'],
      [['CARTE 01/03/25 PAYEE NAME 7428347'], 'Payee Name', 'Carte 01/03/25'],
      [
        [
          'CARTE 03/02/25 PAYEE NAME CB*1234',
          '2,80 NZD / 1 euro = 1,818181818',
        ],
        'Payee Name',
        'Carte 03/02/25 2,80 NZD / 1 euro = 1,818181818',
      ],
      [
        [
          '2,80 NZD / 1 euro = 1,818181818',
          'CARTE 03/02/25 PAYEE NAME CB*1234',
        ],
        'Payee Name',
        'Carte 03/02/25 2,80 NZD / 1 euro = 1,818181818',
      ],
      [
        ['110,04 GBP / 1 euro = 0,860763454', 'CARTE 13/07/25 PAYEE NAME'],
        'Payee Name',
        'Carte 13/07/25 110,04 GBP / 1 euro = 0,860763454',
      ],
      [
        ['RETRAIT DAB 01/03/25 My location CB*9876'],
        'Retrait DAB',
        'Retrait 01/03/25 My location',
      ],
      [
        [
          'RETRAIT DAB 01/03/25 My location CB*9876',
          '2,80 NZD / 1 euro = 1,818181818',
        ],
        'Retrait DAB',
        'Retrait 01/03/25 My location 2,80 NZD / 1 euro = 1,818181818',
      ],
      [
        [
          '2,80 NZD / 1 euro = 1,818181818',
          'RETRAIT DAB 01/03/25 My location CB*9876',
        ],
        'Retrait DAB',
        'Retrait 01/03/25 My location 2,80 NZD / 1 euro = 1,818181818',
      ],
      [
        ['VIR Text put by the sender', 'PAYEE NAME'],
        'Payee Name',
        'Text put by the sender',
      ],
      [
        ['PAYEE NAME', 'VIR Text put by the sender'],
        'Payee Name',
        'Text put by the sender',
      ],
      [
        [
          'VIR Text put by the sender',
          'PAYEE NAME',
          'Réf : SOME TEXT PUT BY THE BANK',
        ],
        'Payee Name',
        'Text put by the sender',
      ],
      [
        [
          'VIR Text put by the sender',
          'Réf : SOME TEXT PUT BY THE BANK',
          'PAYEE NAME',
        ],
        'Payee Name',
        'Text put by the sender',
      ],
      [
        [
          'Réf : SOME TEXT PUT BY THE BANK',
          'VIR Text put by the sender',
          'PAYEE NAME',
        ],
        'Payee Name',
        'Text put by the sender',
      ],
      [
        ['VIR INST PAYEE NAME', 'Text put by the sender'],
        'Payee Name',
        'Text put by the sender',
      ],
      [
        ['Text put by the sender', 'VIR INST PAYEE NAME'],
        'Payee Name',
        'Text put by the sender',
      ],
      [['VIR INST PAYEE NAME'], 'Payee Name', ''],
      [
        ['PAYEE NAME', 'VIR Text put by the sender'],
        'Payee Name',
        'Text put by the sender',
      ],
      [
        [
          'VIR SEPA PAYEE NAME',
          'SOME TEXT',
          'ANOTHER TEXT',
          'YET ANOTHER TEXT',
        ],
        'Payee Name',
        'SOME TEXT ANOTHER TEXT YET ANOTHER TEXT',
      ],
      [
        [
          'SOME TEXT',
          'ANOTHER TEXT',
          'VIR SEPA PAYEE NAME',
          'YET ANOTHER TEXT',
        ],
        'Payee Name',
        'SOME TEXT ANOTHER TEXT YET ANOTHER TEXT',
      ],
      [
        [
          'PRLV SEPA PAYEE NAME',
          'HERE IS SOMETHING',
          'SOME OTHER TEXT',
          '30/04/2025',
          'PRELEVEMENT FOO BAR BAZ du',
        ],
        'Payee Name',
        'HERE IS SOMETHING SOME OTHER TEXT 30/04/2025 PRELEVEMENT FOO BAR BAZ du',
      ],
      [
        [
          '30/05/2025',
          'SOME.TEXT.123.456',
          'PRELEVEMENT FOO BAR BAZ du',
          'PRLV SEPA Payee Name',
          'ABC 1934821371',
        ],
        'Payee Name',
        '30/05/2025 SOME.TEXT.123.456 PRELEVEMENT FOO BAR BAZ du ABC 1934821371',
      ],
      [
        ['ECH PRET:1823918329832913'],
        'Prêt bancaire',
        'ECH PRET:1823918329832913',
      ],
      [['PAYEE NAME 411'], 'Payee Name', ''],
      [['PAYEE NAME\\PARIS\\ FR'], 'Payee Name', ''],
      [['PAYEE NAME 1\\PARIS\\ FR'], 'Payee Name', ''],
      [['AVOIR 17/06/25 PAYEE NAME CB*1234'], 'Payee Name', 'Avoir 17/06/25'],
    ])(
      'normalizes transaction with %s',
      (
        remittanceInformationUnstructuredArray,
        expectedPayeeName,
        expectedNotes,
      ) => {
        const transaction = {
          transactionId: '1234567890',
          bookingDate: '2025-01-01',
          valueDate: '2025-01-01',
          transactionAmount: {
            amount: '100.00',
            currency: 'EUR',
          },
          remittanceInformationUnstructuredArray,
          internalTransactionId: 'abcdef1234567890',
        };

        const normalizedTransaction = BoursoBank.normalizeTransaction(
          transaction,
          true,
        );

        expect(normalizedTransaction.payeeName).toEqual(expectedPayeeName);
        expect(normalizedTransaction.notes).toEqual(expectedNotes);
      },
    );
  });
});
