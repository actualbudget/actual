import { Parser } from 'mt940js';
import type { Mt940Transaction } from 'mt940js';

type Mt940ParsedTransaction = {
  amount: number;
  date: Date;
  payee_name: string | null;
  imported_payee: string | null;
  notes: string | null;
  imported_id: string | null;
};

// `:86:` structured subtags holding a counterparty name. `NAME` is the SEPA
// (/TRTP/) spelling; `32` and `33` are the German (>DD) name lines.
const PAYEE_SUBTAGS = ['NAME', '32', '33'];
// Subtags holding the remittance info / description.
const NOTES_SUBTAGS = ['REMI', '20', '21', '22', '23', '24', '25', '00'];

// Some banks prefix `:86:` with their own transaction code followed by `?`, then
// put the counterparty on the first line and the description on the following
// ones. mt940js only detects the `/XXX/` and `>DD` layouts, so this shape
// arrives as unstructured text.
const CODE_PREFIXED_DETAILS = /^[0-9A-Z]{2,4}\?/;

function joinSubtags(
  details: Record<string, string>,
  subtags: string[],
): string | null {
  const value = subtags
    .map(tag => details[tag]?.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  return value || null;
}

// Splits `CODE?Counterparty\ndescription lines` into payee and notes.
function parseCodePrefixedDetails(details: string, extraDetails: string) {
  const [firstLine, ...rest] = details.split('\n');
  let payee_name = firstLine.slice(firstLine.indexOf('?') + 1).trim();
  let notes = rest
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ');

  // Some entries put the payee and the description on that same first line,
  // with the description repeating the `:61:` extra details. Split them apart
  // rather than importing "ACME LTD Card payment" as the payee.
  const suffix = extraDetails.trim();
  if (!notes && suffix && payee_name.length > suffix.length) {
    if (payee_name.endsWith(suffix)) {
      payee_name = payee_name.slice(0, -suffix.length).trim();
      notes = suffix;
    }
  }

  return {
    payee_name: payee_name || notes || null,
    notes: (payee_name && notes) || null,
  };
}

function extractPayeeAndNotes(trans: Mt940Transaction) {
  const structured = trans.structuredDetails;
  const raw = trans.details?.trim() || null;

  if (!structured) {
    if (raw && CODE_PREFIXED_DETAILS.test(raw)) {
      return parseCodePrefixedDetails(raw, trans.extraDetails || '');
    }
    return { payee_name: raw, notes: null };
  }

  const payee_name = joinSubtags(structured, PAYEE_SUBTAGS);
  const notes = joinSubtags(structured, NOTES_SUBTAGS);

  // If the structure held no name, fall back to the remittance info as the
  // payee rather than importing the whole raw blob.
  if (!payee_name) {
    return { payee_name: notes ?? raw, notes: null };
  }

  return { payee_name, notes };
}

// MT940 carries no charset declaration. UTF-8 is the safe assumption, but banks
// commonly emit a single-byte encoding (SWIFT predates Unicode), which would
// otherwise turn accented names into replacement characters. Strict UTF-8
// decoding fails on single-byte high bytes, which makes it a reliable way to
// tell the two apart. windows-1252 is the fallback because it covers everything
// ISO-8859-1 does plus the punctuation banks put in `0x80`-`0x9F`, notably the
// typographic apostrophe. Central and Eastern European letters have no
// windows-1252 byte, so those statements have to arrive as UTF-8.
function decodeStatement(contents: Uint8Array | string): string {
  if (typeof contents === 'string') {
    return contents;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(contents);
  } catch {
    return new TextDecoder('windows-1252').decode(contents);
  }
}

export function mt9402json(contents: Uint8Array | string): {
  transactions: Mt940ParsedTransaction[];
} {
  const statements = new Parser().parse(decodeStatement(contents));

  const transactions = statements.flatMap(statement =>
    statement.transactions.map(trans => {
      const { payee_name, notes } = extractPayeeAndNotes(trans);

      return {
        // mt940js already applies the debit/credit sign, including reversals.
        amount: trans.amount,
        date: trans.date,
        payee_name,
        imported_payee: payee_name,
        notes,
        // `reference` is the literal `NONREF` on most statements, which would
        // collide across every entry, so only the bank reference is usable as
        // a dedup key.
        imported_id: trans.bankReference?.trim() || null,
      };
    }),
  );

  return { transactions };
}
