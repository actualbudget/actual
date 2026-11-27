import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { BankFactory } from '#app-enablebanking/bank-factory';
import IngItalyBank, {
  extractIngItalyPayee,
  isIngItaly,
} from '#app-enablebanking/banks/ing_it';
import IntegrationBank from '#app-enablebanking/banks/integration-bank';
import {
  normalizeTransaction,
  normalizeTransactions,
} from '#app-enablebanking/services/enablebanking-service';
import type { EnableBankingTransaction } from '#app-enablebanking/services/enablebanking-service';

const fixtureTransactions: EnableBankingTransaction[] = JSON.parse(
  readFileSync(
    new URL('./fixtures/ing-it-transactions.json', import.meta.url),
    'utf-8',
  ),
);

const typedFixtureTransactions = fixtureTransactions;

describe('ING Italy adapter (ing-it)', () => {
  describe('isIngItaly', () => {
    it('returns true for ING Italy with exact uppercase', () => {
      expect(isIngItaly({ name: 'ING', country: 'IT' })).toBe(true);
    });

    it('returns true for ING Italy case-insensitively and with surrounding whitespace', () => {
      expect(isIngItaly({ name: 'ing', country: 'it' })).toBe(true);
      expect(isIngItaly({ name: '  ING  ', country: 'it' })).toBe(true);
      expect(isIngItaly({ name: 'Ing', country: 'IT' })).toBe(true);
    });

    it('returns false for non-IT country with ING', () => {
      expect(isIngItaly({ name: 'ING', country: 'FR' })).toBe(false);
      expect(isIngItaly({ name: 'ING', country: 'NL' })).toBe(false);
      expect(isIngItaly({ name: 'ING', country: 'DE' })).toBe(false);
    });

    it('returns false for non-ING name in IT', () => {
      expect(isIngItaly({ name: 'Intesa Sanpaolo', country: 'IT' })).toBe(
        false,
      );
      expect(isIngItaly({ name: 'UniCredit', country: 'IT' })).toBe(false);
      expect(isIngItaly({ name: 'BNL', country: 'IT' })).toBe(false);
    });

    it('returns false when country or name is missing or null', () => {
      expect(isIngItaly({ name: 'ING', country: null })).toBe(false);
      expect(isIngItaly({ name: 'ING', country: undefined })).toBe(false);
      expect(isIngItaly({ name: null, country: 'IT' })).toBe(false);
      expect(isIngItaly({ name: undefined, country: 'IT' })).toBe(false);
      expect(isIngItaly({})).toBe(false);
      expect(isIngItaly(undefined)).toBe(false);
    });
  });

  describe('extractIngItalyPayee', () => {
    it('extracts payee from 1) Bonifico in uscita ("A favore di <PAYEE>")', () => {
      const tx = typedFixtureTransactions[0];
      expect(extractIngItalyPayee(tx)).toBe('MARIO ROSSI');
    });

    it('extracts payee from 2) Bonifico istantaneo in entrata ("Anagrafica Ordinante <PAYEE>")', () => {
      const tx = typedFixtureTransactions[1];
      expect(extractIngItalyPayee(tx)).toBe('LUCA BIANCHI');
    });

    it('extracts payee from 3) Addebito SDD CORE ("Creditor id. <CID> <PAYEE>")', () => {
      const tx = typedFixtureTransactions[2];
      expect(extractIngItalyPayee(tx)).toBe('ENEL ENERGIA SPA');
    });

    it('extracts payee from SDD CORE when bank_transaction_code is absent', () => {
      const tx: EnableBankingTransaction = {
        transaction_amount: { currency: 'EUR', amount: '-65.40' },
        bank_transaction_code: null,
        remittance_information: [
          'Addebito SDD CORE Scad. 03/03/2026 Imp. 65,40 Creditor id. IT00ABC123456789 ENEL ENERGIA SPA Id Mandato MAND-98765',
        ],
      };
      expect(extractIngItalyPayee(tx)).toBe('ENEL ENERGIA SPA');
    });

    it('prioritizes wire transfer recipient over "presso" in transfer notes', () => {
      const tx: EnableBankingTransaction = {
        transaction_amount: { currency: 'EUR', amount: '-150.00' },
        bank_transaction_code: { description: 'Bonifico In Uscita' },
        remittance_information: [
          'Bonifico da voi disposto A favore di MARIO ROSSI IBAN beneficiario IT60X0542811101000000123456 Note: Pagamento presso BAR DEL CORSO',
        ],
      };
      expect(extractIngItalyPayee(tx)).toBe('MARIO ROSSI');
    });

    it('does not treat "A favore di" inside incoming transfer notes as an outgoing transfer', () => {
      const tx: EnableBankingTransaction = {
        transaction_amount: { currency: 'EUR', amount: '50.00' },
        bank_transaction_code: { description: 'Bonifico in accredito' },
        remittance_information: [
          'Bonifico istantaneo Anagrafica Ordinante LUCA BIANCHI Note: A favore di MARIO ROSSI per compleanno',
        ],
      };
      expect(extractIngItalyPayee(tx)).toBe('LUCA BIANCHI');
    });

    it('extracts payee from 4) Pagamento carta POS con suffisso ("presso <PAYEE>")', () => {
      const tx = typedFixtureTransactions[3];
      expect(extractIngItalyPayee(tx)).toBe('BAR DEL CORSO');
    });

    it('extracts payee from 5) Pagamento carta online ("presso <PAYEE>")', () => {
      const tx = typedFixtureTransactions[4];
      expect(extractIngItalyPayee(tx)).toBe('AMAZON EU SARL');
    });

    it('extracts payee from 6) Accredito stipendio ("Anagrafica Ordinante <PAYEE>")', () => {
      const tx = typedFixtureTransactions[5];
      expect(extractIngItalyPayee(tx)).toBe('ACME CORP SPA');
    });

    it('extracts payee from 7) Pagamento carta normalizzando spazi multipli ("presso <PAYEE>")', () => {
      const tx = typedFixtureTransactions[6];
      expect(extractIngItalyPayee(tx)).toBe('PASTICCERIA CENTRALE ROMA');
    });

    it('extracts payee from 8) Prelievo carta ("presso <PAYEE>")', () => {
      const tx = typedFixtureTransactions[7];
      expect(extractIngItalyPayee(tx)).toBe('UNICREDIT BANCA');
    });

    it('returns null when remittance_information is missing, empty, or whitespace', () => {
      expect(
        extractIngItalyPayee({
          transaction_amount: { currency: 'EUR', amount: '10.00' },
        }),
      ).toBeNull();

      expect(
        extractIngItalyPayee({
          transaction_amount: { currency: 'EUR', amount: '10.00' },
          remittance_information: [],
        }),
      ).toBeNull();

      expect(
        extractIngItalyPayee({
          transaction_amount: { currency: 'EUR', amount: '10.00' },
          remittance_information: ['   '],
        }),
      ).toBeNull();
    });

    it('returns null when remittance_information format is not recognized', () => {
      expect(
        extractIngItalyPayee({
          transaction_amount: { currency: 'EUR', amount: '10.00' },
          remittance_information: ['Canone mensile tenuta conto'],
        }),
      ).toBeNull();

      expect(
        extractIngItalyPayee({
          transaction_amount: { currency: 'EUR', amount: '10.00' },
          remittance_information: ['Imposta di bollo'],
        }),
      ).toBeNull();
    });
  });

  describe('Integration with normalizeTransaction and normalizeTransactions', () => {
    const aspspIngIt = { name: 'ING', country: 'IT' };

    it('normalizes ING transactions extracting payee and preserving full notes', () => {
      const tx = typedFixtureTransactions[0];
      const normalized = normalizeTransaction(tx, aspspIngIt);

      expect(normalized.payeeName).toBe('MARIO ROSSI');
      expect(normalized.notes).toBe(tx.remittance_information?.[0]);
      expect(normalized.transactionAmount.amount).toBe('-150.00');
    });

    it('normalizes all fixture transactions in batch', () => {
      const normalizedList = normalizeTransactions(
        typedFixtureTransactions,
        aspspIngIt,
      );

      expect(normalizedList).toHaveLength(8);
      expect(normalizedList[0].payeeName).toBe('MARIO ROSSI');
      expect(normalizedList[1].payeeName).toBe('LUCA BIANCHI');
      expect(normalizedList[2].payeeName).toBe('ENEL ENERGIA SPA');
      expect(normalizedList[3].payeeName).toBe('BAR DEL CORSO');
      expect(normalizedList[4].payeeName).toBe('AMAZON EU SARL');
      expect(normalizedList[5].payeeName).toBe('ACME CORP SPA');
      expect(normalizedList[6].payeeName).toBe('PASTICCERIA CENTRALE ROMA');
      expect(normalizedList[7].payeeName).toBe('UNICREDIT BANCA');

      for (let i = 0; i < normalizedList.length; i++) {
        expect(normalizedList[i].notes).toBe(
          typedFixtureTransactions[i].remittance_information?.[0],
        );
      }
    });

    it('gives absolute priority to structured counterparty over ING regex', () => {
      const txWithCreditor: EnableBankingTransaction = {
        ...typedFixtureTransactions[0],
        creditor: { name: 'STRUCTURED CREDITOR NAME' },
      };
      const normalized = normalizeTransaction(txWithCreditor, aspspIngIt);

      expect(normalized.payeeName).toBe('STRUCTURED CREDITOR NAME');
    });

    it('falls back to raw remittance line when aspsp is not ING Italy', () => {
      const tx = typedFixtureTransactions[0];
      const normalizedOtherBank = normalizeTransaction(tx, {
        name: 'OTHER BANK',
        country: 'IT',
      });

      expect(normalizedOtherBank.payeeName).toBe(
        tx.remittance_information?.[0],
      );

      const normalizedNoAspsp = normalizeTransaction(tx);
      expect(normalizedNoAspsp.payeeName).toBe(tx.remittance_information?.[0]);
    });
  });

  describe('BankFactory', () => {
    it('returns IngItalyBank when aspsp matches ING Italy', () => {
      expect(BankFactory({ name: 'ING', country: 'IT' })).toBe(IngItalyBank);
      expect(BankFactory({ name: 'ing', country: 'it' })).toBe(IngItalyBank);
    });

    it('returns IntegrationBank when aspsp is not ING Italy or missing', () => {
      expect(BankFactory({ name: 'UniCredit', country: 'IT' })).toBe(
        IntegrationBank,
      );
      expect(BankFactory({ name: 'ING', country: 'FR' })).toBe(IntegrationBank);
      expect(BankFactory(undefined)).toBe(IntegrationBank);
    });
  });
});
