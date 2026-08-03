import { describe, expect, it } from 'vitest';

import { mt9402json } from './mt9402json';

function statement(...lines: string[]) {
  return [
    '{1:F01BANKFRPPAXXX0000000000}',
    '{2:I940BANKFRPPXXXXN}',
    '{4:',
    ':20:STATEMENT001',
    ':25:IBAN123456789012345678',
    ':28C:001/001',
    ':60F:C250802EUR10000,00',
    ...lines,
    ':62F:C250802EUR10000,00',
    '-}',
  ].join('\n');
}

function latin1(text: string) {
  return Uint8Array.from(text, character => character.charCodeAt(0));
}

describe('mt9402json', () => {
  it('parses debit transactions and bank references', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF1',
        ':86:Payment to Vendor',
      ),
    );

    expect(transactions).toEqual([
      {
        amount: -150,
        date: '2025-08-02',
        payee_name: 'Payment to Vendor',
        imported_payee: 'Payment to Vendor',
        notes: null,
        imported_id: 'BANKREF1',
      },
    ]);
  });

  it('keeps credits positive', () => {
    const { transactions } = mt9402json(
      statement(':61:2508030803C50,00NTRFNONREF//BANKREF2', ':86:Salary'),
    );

    expect(transactions[0].amount).toBe(50);
  });

  it('splits bank-prefixed details into payee and notes', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF3',
        ':86:A44?Librairie Gibert Joseph\nVirement en ligne',
      ),
    );

    expect(transactions[0]).toMatchObject({
      payee_name: 'Librairie Gibert Joseph',
      notes: 'Virement en ligne',
    });
  });

  it('extracts payee and notes from slash-delimited details', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF7',
        ':86:/TRTP/SEPA/IBAN/FR123/NAME/John Doe/REMI/Invoice 12345',
      ),
    );

    expect(transactions[0]).toMatchObject({
      payee_name: 'John Doe',
      notes: 'Invoice 12345',
    });
  });

  it('extracts payee and ordered notes from question-mark details', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF8',
        ':86:166?00SEPA ÜBERWEISUNG?20Rechnung 4711?32MÜLLER GMBH',
      ),
    );

    expect(transactions[0]).toMatchObject({
      payee_name: 'MÜLLER GMBH',
      notes: 'Rechnung 4711 SEPA ÜBERWEISUNG',
    });
  });

  it('falls back to remittance details when no payee is present', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF9',
        ':86:/TRTP/SEPA/REMI/Invoice 12345',
      ),
    );

    expect(transactions[0]).toMatchObject({
      payee_name: 'Invoice 12345',
      notes: null,
    });
  });

  it('removes repeated supplementary details from the payee', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NMSCNONREF//BANKREF10\nPaiement mobile',
        ':86:B32?TREMBLAY, MARIE Paiement mobile',
      ),
    );

    expect(transactions[0]).toMatchObject({
      payee_name: 'TREMBLAY, MARIE',
      notes: 'Paiement mobile',
    });
  });

  it('does not strip a non-matching supplementary detail', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NCHGNONREF//BANKREF11\nFrais de tenue de compte trimestrie.',
        ':86:C92?Frais de tenue de compte trimestriels',
      ),
    );

    expect(transactions[0]).toMatchObject({
      payee_name: 'Frais de tenue de compte trimestriels',
      notes: null,
    });
  });

  it('decodes single-byte Western European accents', () => {
    const text = statement(
      ':61:2508020802D150,00NTRFNONREF//BANKREF12',
      ":86:A44?L'\x9cil de Paris\nCrème brûlée, pâté, dîner, mañana, smørrebrød, Käse, Grüße, Öl, ação, Île 12,50\x80",
    );

    const { transactions } = mt9402json(latin1(text));

    expect(transactions[0]).toMatchObject({
      payee_name: "L'œil de Paris",
      notes:
        'Crème brûlée, pâté, dîner, mañana, smørrebrød, Käse, Grüße, Öl, ação, Île 12,50€',
    });
  });

  it('decodes UTF-8 statements', () => {
    const text = statement(
      ':61:2508020802D150,00NTRFNONREF//BANKREF5',
      ":86:A44?L'Épicerie du Marché\nŒuvre, źdźbło, řeka, ő ű, ğ ş",
    );

    const { transactions } = mt9402json(new TextEncoder().encode(text));

    expect(transactions[0]).toMatchObject({
      payee_name: "L'Épicerie du Marché",
      notes: 'Œuvre, źdźbło, řeka, ő ű, ğ ş',
    });
  });

  it('flattens transactions across multiple statements', () => {
    const single = statement(
      ':61:2508020802D150,00NTRFNONREF//BANKREF6',
      ':86:Vendor A',
    );

    expect(mt9402json(`${single}\n${single}`).transactions).toHaveLength(2);
  });

  it('keeps transactions without bank references deduplicable by null ID', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF',
        ':86:Vendor A',
        ':61:2508030803D75,00NTRFNONREF',
        ':86:Vendor B',
      ),
    );

    expect(transactions.map(transaction => transaction.imported_id)).toEqual([
      null,
      null,
    ]);
  });

  it('handles reversal indicators', () => {
    const { transactions } = mt9402json(
      statement(':61:2508040804RD25,00NTRFNONREF//BANKREF13', ':86:Refund'),
    );

    expect(transactions[0].amount).toBe(-25);
  });

  it('rejects input without transactions', () => {
    expect(() => mt9402json('not an MT940 statement')).toThrow();
  });
});
