import type { EnableBankingTransaction } from '#app-enablebanking/types';

export function isIngItaly(aspsp?: {
  name?: string | null;
  country?: string | null;
}): boolean {
  return (
    aspsp?.country?.toUpperCase() === 'IT' &&
    aspsp?.name?.trim().toUpperCase() === 'ING'
  );
}

/**
 * Extracts payee name for ING Italy transactions based on transaction type
 * and remittance information placeholder keywords.
 *
 * Each transaction type has the payee following a specific keyword:
 * 1. Card operations (Pagamento Carta, Prelievo Carta, Trasferimento):
 *    Keyword placeholder: "presso <PAYEE>" (terminated by " - Transazione" or end of string)
 * 2. Incoming transfers / salary credits:
 *    Keyword placeholder: "Anagrafica Ordinante <PAYEE>" (terminated by " Note:" or end of string)
 * 3. Outgoing transfers:
 *    Keyword placeholder: "A favore di <PAYEE>" (terminated by " IBAN beneficiario", " Note:" or end of string)
 * 4. Direct debits (SDD CORE):
 *    Keyword placeholder: "Creditor id. <CID> <PAYEE>" (terminated by " Id Mandato", " Debitore", " Rif." or end of string)
 */
export function extractIngItalyPayee(
  tx: EnableBankingTransaction,
): string | null {
  const remittance = tx.remittance_information?.[0]?.trim();
  if (!remittance) {
    return null;
  }

  const txType = (tx.bank_transaction_code?.description || '').toLowerCase();
  const preNote = remittance.split(/\bNote:/i)[0];

  // 1. Bonifici in uscita
  // Placeholder: "A favore di <PAYEE>"
  if (txType.includes('uscita') || /\bA favore di\b/i.test(preNote)) {
    const bonificoUscitaMatch = remittance.match(
      /\bA favore di\s+(.+?)(?:\s+IBAN beneficiario\b|\s+Note:|$)/i,
    );
    if (bonificoUscitaMatch?.[1]?.trim()) {
      return bonificoUscitaMatch[1].replace(/\s+/g, ' ').trim();
    }
  }

  // 2. Bonifici in entrata / Accrediti stipendio / Bonifici esteri
  // Placeholder: "Anagrafica Ordinante <PAYEE>"
  if (
    txType.includes('accredito') ||
    /\bAnagrafica Ordinante\b/i.test(remittance)
  ) {
    const bonificoEntrataMatch = remittance.match(
      /\bAnagrafica Ordinante\s+(.+?)(?:\s+Note:|$)/i,
    );
    if (bonificoEntrataMatch?.[1]?.trim()) {
      return bonificoEntrataMatch[1].replace(/\s+/g, ' ').trim();
    }
  }

  // 3. Addebito Diretto (SDD)
  // Placeholder: "Creditor id. <CID> <PAYEE>"
  if (
    txType.includes('addebito diretto') ||
    /\bCreditor id\.\s/i.test(remittance)
  ) {
    const sddMatch = remittance.match(
      /\bCreditor id\.\s+\S+\s+(.+?)(?:\s+Id Mandato\b|\s+Debitore\b|\s+Rif\.|$)/i,
    );
    if (sddMatch?.[1]?.trim()) {
      return sddMatch[1].replace(/\s+/g, ' ').trim();
    }
  }

  // 4. Operazioni con Carta (Pagamento Carta, Prelievo Carta, Trasferimento...)
  // Placeholder: "presso <PAYEE>"
  if (
    txType.includes('carta') ||
    txType.includes('accredito su carta') ||
    /\bpresso\b/i.test(remittance)
  ) {
    const cardMatch = remittance.match(
      /\bpresso\s+(.+?)(?:\s+-\s+Transazione\b|$)/i,
    );
    if (cardMatch?.[1]?.trim()) {
      return cardMatch[1].replace(/\s+/g, ' ').trim();
    }
  }

  return null;
}
