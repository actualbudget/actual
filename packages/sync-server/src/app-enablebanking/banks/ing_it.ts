import type {
  BankSyncTransaction,
  EnableBankingTransaction,
} from '#app-enablebanking/services/enablebanking-service';

import type { EnableBankingAspsp, IEnableBankingBank } from './bank.interface';
import IntegrationBank from './integration-bank';

export function isIngItaly(aspsp?: EnableBankingAspsp): boolean {
  return (
    aspsp?.country?.toUpperCase() === 'IT' &&
    aspsp?.name?.trim().toUpperCase() === 'ING'
  );
}

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

const IngItalyBank: IEnableBankingBank = {
  ...IntegrationBank,

  matches: isIngItaly,

  normalizeTransaction(
    tx: EnableBankingTransaction,
    editedTransaction?: Partial<EnableBankingTransaction>,
  ): BankSyncTransaction {
    const effectiveTx = editedTransaction
      ? { ...tx, ...editedTransaction }
      : tx;

    const normalized = IntegrationBank.normalizeTransaction(
      tx,
      editedTransaction,
    );

    // If standard creditor/debtor fields did not yield a specific payee,
    // try extracting the payee from ING Italy's remittance information.
    const hasStructuredPayee = Boolean(
      effectiveTx.credit_debit_indicator === 'CRDT'
        ? effectiveTx.debtor?.name
        : effectiveTx.credit_debit_indicator === 'DBIT'
          ? effectiveTx.creditor?.name
          : effectiveTx.creditor?.name || effectiveTx.debtor?.name,
    );

    if (!hasStructuredPayee) {
      const ingPayee = extractIngItalyPayee(effectiveTx);
      if (ingPayee) {
        normalized.payeeName = ingPayee;
      }
    }

    return normalized;
  },
};

export default IngItalyBank;
