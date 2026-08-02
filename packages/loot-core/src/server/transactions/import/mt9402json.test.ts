import { describe, expect, it } from 'vitest';

import { mt9402json } from './mt9402json';

const OPENING_BALANCE = 10000;

// mt940js validates that opening balance + sum of lines = closing balance, so
// the closing balance is derived from the `:61:` lines rather than hardcoded.
function statement(...lines: string[]) {
  const closing = lines.reduce((total, line) => {
    const match = line.match(/^:61:\d{6}(?:\d{4})?(R?[DC])([\d,]+)/);
    if (!match) {
      return total;
    }
    const amount = Number.parseFloat(match[2].replace(',', '.'));
    return total + (match[1].endsWith('D') ? -amount : amount);
  }, OPENING_BALANCE);

  return [
    ':20:1234567890ABCDEF',
    ':25:IBAN123456789012345678',
    ':28C:001/001',
    `:60F:C250802EUR${OPENING_BALANCE.toFixed(2).replace('.', ',')}`,
    ...lines,
    `:62F:C250802EUR${closing.toFixed(2).replace('.', ',')}`,
  ].join('\n');
}

// Encodes text as single-byte windows-1252. Only correct for characters whose
// code point equals their byte value, which is every character the statements
// below use (including `\x92`, the typographic apostrophe).
function windows1252(text: string) {
  return Uint8Array.from(text, char => char.charCodeAt(0));
}

describe('mt9402json', () => {
  it('parses unstructured transactions', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF1',
        ':86:Payment to Vendor',
      ),
    );

    expect(transactions).toEqual([
      {
        // Debits are negative.
        amount: -150,
        date: new Date(Date.UTC(2025, 7, 2)),
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

  it('extracts payee and notes from structured SEPA details', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF1',
        ':86:/TRTP/SEPA OVERBOEKING/IBAN/FR1420041010050500013M02606/BIC/PSSTFRPP/NAME/John Doe/REMI/Invoice 12345',
      ),
    );

    expect(transactions[0].payee_name).toBe('John Doe');
    expect(transactions[0].notes).toBe('Invoice 12345');
  });

  it('extracts payee and notes from structured German details', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF1',
        ':86:166?00SEPA ÜBERWEISUNG?20Rechnung 4711?32MÜLLER GMBH',
      ),
    );

    expect(transactions[0].payee_name).toBe('MÜLLER GMBH');
    expect(transactions[0].notes).toBe('Rechnung 4711 SEPA ÜBERWEISUNG');
  });

  it('falls back to remittance info when the structure has no name', () => {
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF1',
        ':86:/TRTP/SEPA/REMI/Invoice 12345',
      ),
    );

    expect(transactions[0].payee_name).toBe('Invoice 12345');
    expect(transactions[0].notes).toBeNull();
  });

  it('splits a bank code prefix from the payee', () => {
    // Some banks prefix `:86:` with their own transaction code, then put the
    // counterparty on the first line and the description on the next.
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF//BANKREF1',
        ':86:A44?Librairie Gibert Joseph\nVirement en ligne',
      ),
    );

    expect(transactions[0].payee_name).toBe('Librairie Gibert Joseph');
    expect(transactions[0].notes).toBe('Virement en ligne');
  });

  it('splits a description repeated on the payee line', () => {
    // Some entries inline the description after the payee on the same line,
    // duplicating the `:61:` extra details.
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NMSCNONREF//BANKREF1\nPaiement mobile',
        ':86:B32?TREMBLAY, MARIE Paiement mobile',
      ),
    );

    expect(transactions[0].payee_name).toBe('TREMBLAY, MARIE');
    expect(transactions[0].notes).toBe('Paiement mobile');
  });

  it('keeps a payee that merely resembles the extra details', () => {
    // The extra details are truncated here, so they are not a suffix of the
    // payee and nothing should be split off.
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NCHGNONREF//BANKREF1\nFrais de tenue de compte trimestrie.',
        ':86:C92?Frais de tenue de compte trimestriels',
      ),
    );

    expect(transactions[0].payee_name).toBe(
      'Frais de tenue de compte trimestriels',
    );
    expect(transactions[0].notes).toBeNull();
  });

  it('decodes single-byte Western European statements', () => {
    // MT940 carries no charset declaration and banks still emit windows-1252.
    // Every character here is a single byte in that encoding: French accents,
    // Spanish `ñ`, Nordic `ø`, German umlauts and `ß`, Portuguese `ç`/`ã`, plus
    // `\x80`/`\x9c` (`€`/`œ`), which live in the range strict ISO-8859-1 leaves
    // undefined. They are written as escapes because the source file itself is
    // UTF-8.
    const text = statement(
      ':61:2508020802D150,00NTRFNONREF//BANKREF1',
      ":86:A44?L'\x9cil de Paris\nCrème brûlée, pâté, dîner, mañana, smørrebrød, Käse, Grüße, Öl, ação, Île 12,50\x80",
    );

    const { transactions } = mt9402json(windows1252(text));

    expect(transactions[0].payee_name).toBe("L'œil de Paris");
    expect(transactions[0].notes).toBe(
      'Crème brûlée, pâté, dîner, mañana, smørrebrød, Käse, Grüße, Öl, ação, Île 12,50€',
    );
  });

  it('decodes UTF-8 statements', () => {
    // Central and Eastern European letters have no windows-1252 byte, so they
    // only survive when the bank emits UTF-8.
    const text = statement(
      ':61:2508020802D150,00NTRFNONREF//BANKREF1',
      ":86:A44?L'Épicerie du Marché\nŒuvre 12,50 € — źdźbło (pl), řeka (cs), ő ű (hu), ğ ş (tr)",
    );

    const { transactions } = mt9402json(new TextEncoder().encode(text));

    expect(transactions[0].payee_name).toBe("L'Épicerie du Marché");
    expect(transactions[0].notes).toBe(
      'Œuvre 12,50 € — źdźbło (pl), řeka (cs), ő ű (hu), ğ ş (tr)',
    );
  });

  it('does not use NONREF as an imported_id', () => {
    // NONREF is the MT940 placeholder for "no reference" and repeats across
    // entries, so using it would collide during deduplication.
    const { transactions } = mt9402json(
      statement(
        ':61:2508020802D150,00NTRFNONREF',
        ':86:Vendor A',
        ':61:2508030803D75,00NTRFNONREF',
        ':86:Vendor B',
      ),
    );

    expect(transactions.map(t => t.imported_id)).toEqual([null, null]);
  });

  it('flattens transactions across multiple statements', () => {
    const single = statement(
      ':61:2508020802D150,00NTRFNONREF//BANKREF1',
      ':86:Vendor A',
    );
    const { transactions } = mt9402json(`${single}\n-\n${single}`);

    expect(transactions).toHaveLength(2);
  });

  it('throws on input that is not MT940', () => {
    expect(() => mt9402json('not a statement')).toThrow();
  });
});
