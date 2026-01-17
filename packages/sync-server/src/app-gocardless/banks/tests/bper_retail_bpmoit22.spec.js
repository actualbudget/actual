import BperRetail from '../bper_retail_bpmoit22';

const bookingDate = '2025-09-17';

describe('BPER Retail BPMOIT22', () => {
  describe('#normalizeTransaction', () => {
    it('extracts card merchant between the circuit prefix and operation suffix', () => {
      const transaction = {
        bookingDate,
        remittanceInformationUnstructured:
          'PAGAMENTO SU CIRCUITO INTERNAZIONALE HEALTHCARE DISTRICT ZX042 METROPOLIS ITA Operazione carta ****8005 del 15.09.2025',
        transactionAmount: { amount: '-17.80', currency: 'EUR' },
      };

      const normalizedTransaction = BperRetail.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual(
        'Healthcare District Zx042 Metropolis Ita',
      );
      expect(normalizedTransaction.notes).toEqual(
        'PAGAMENTO SU CIRCUITO INTERNAZIONALE HEALTHCARE DISTRICT ZX042 METROPOLIS ITA Operazione carta ****8005 del 15.09.2025',
      );
    });

    it('extracts bonifico originator appearing after o/c:', () => {
      const transaction = {
        bookingDate,
        remittanceInformationUnstructured:
          'BONIFICO o/c: ACME CONSULTING SRL ABI-CAB: 03015-03200 a favore di Example Recipient Num. Bon.Sepa 252531000195141 Note di cortesia',
        transactionAmount: { amount: '1000.00', currency: 'EUR' },
      };

      const normalizedTransaction = BperRetail.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual('Acme Consulting Srl');
      expect(normalizedTransaction.notes).toEqual(
        'BONIFICO o/c: ACME CONSULTING SRL ABI-CAB: 03015-03200 a favore di Example Recipient Num. Bon.Sepa 252531000195141 Note di cortesia',
      );
    });

    it('extracts foreign bonifico originator before the BIC marker', () => {
      const transaction = {
        bookingDate,
        remittanceInformationUnstructured:
          'BONIFICI ESTERI o/c: GLOBAL PARTNERS LTD BIC: EXAMPGB2L a favore di Example Recipient (BPER) Num. Bon.Sepa 252131000238275BE Memo casuale 1.000,00 EUR',
        transactionAmount: { amount: '1000.00', currency: 'EUR' },
      };

      const normalizedTransaction = BperRetail.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual('Global Partners Ltd');
      expect(normalizedTransaction.notes).toEqual(
        'BONIFICI ESTERI o/c: GLOBAL PARTNERS LTD BIC: EXAMPGB2L a favore di Example Recipient (BPER) Num. Bon.Sepa 252131000238275BE Memo casuale 1.000,00 EUR',
      );
    });

    it('extracts creditor for SDD direct debits', () => {
      const transaction = {
        bookingDate,
        remittanceInformationUnstructured:
          'ADDEBITO SDD CLOUD HOSTING LTD N: 1057087621/48 ID:0210000049513 Cod.Cl. K309846700/ Fatt. 109993626070 Deb: Example Account Owner',
        transactionAmount: { amount: '-1.22', currency: 'EUR' },
      };

      const normalizedTransaction = BperRetail.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual('Cloud Hosting Ltd');
      expect(normalizedTransaction.notes).toEqual(
        'ADDEBITO SDD CLOUD HOSTING LTD N: 1057087621/48 ID:0210000049513 Cod.Cl. K309846700/ Fatt. 109993626070 Deb: Example Account Owner',
      );
    });

    it('captures bollettino creditor after CREDITORE:', () => {
      const transaction = {
        bookingDate,
        remittanceInformationUnstructured:
          'PAGAMENTI DIVERSI DA INTERNET BANKING E CSA PAGAMENTO BOLLETTINO POSTALE 420251388002409360 DEL 22/06/2025 TRAMITE I.B. / CSA TIPO : 896 CCPOST : 000000000000 CREDITORE: UTILITY COMPANY S.P.A.',
        transactionAmount: { amount: '-171.34', currency: 'EUR' },
      };

      const normalizedTransaction = BperRetail.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual('Utility Company S.P.A.');
      expect(normalizedTransaction.notes).toEqual(
        'PAGAMENTI DIVERSI DA INTERNET BANKING E CSA PAGAMENTO BOLLETTINO POSTALE 420251388002409360 DEL 22/06/2025 TRAMITE I.B. / CSA TIPO : 896 CCPOST : 000000000000 CREDITORE: UTILITY COMPANY S.P.A.',
      );
    });

    it('falls back to the original description when no pattern matches', () => {
      const transaction = {
        bookingDate,
        remittanceInformationUnstructured: 'COMPETENZE SPESE ED ONERI',
        transactionAmount: { amount: '-4.90', currency: 'EUR' },
      };

      const normalizedTransaction = BperRetail.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual(
        'Competenze Spese Ed Oneri',
      );
      expect(normalizedTransaction.notes).toEqual('COMPETENZE SPESE ED ONERI');
    });
  });
});
