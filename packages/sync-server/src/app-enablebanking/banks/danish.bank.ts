import { components } from '../models/enablebanking-openapi.js';
import { Transaction } from '../models/enablebanking.js';

import { BankProcessorFor } from './bank-registry.js';
import { FallbackBankProcessor } from './fallback.bank.js';

/**
 * Minimal payee extraction for Danish banks.
 * Only removes transaction type prefixes - rules handle vendor normalization.
 */
function extractPayeeFromNotes(notes: string): string {
  if (!notes) return '';

  // Remove metadata suffix (col3=..., col4=..., etc.)
  let clean = notes.replace(/\s*\|\s*col\d+=.*$/i, '').trim();

  // Remove common prefixes, keeping the rest as payee
  clean = clean
    .replace(/^Dankort-køb\s+/i, '')
    .replace(/^Visa\/Dankort\s+/i, '')
    .replace(/^Visa\s+/i, '')
    .replace(/^Mastercard\s+/i, '')
    .replace(/^Betalingsservice\s+/i, '')
    .replace(/^Netbank\s+/i, '')
    .replace(/^PBS\s+/i, '')
    .replace(/^Til\s+/i, '')
    .trim();

  // Handle MobilePay - if only "MobilePay Nota XXXX" remains, use "MobilePay" as payee
  const mobilePayMatch = clean.match(/^MobilePay\s+Nota\s+\d+$/i);
  if (mobilePayMatch) {
    return 'MobilePay';
  }
  // Remove MobilePay prefix if followed by merchant name
  clean = clean.replace(/^MobilePay:?\s*/i, '').trim();

  // Handle foreign currency transactions where merchant is AFTER "Nota nr. XXXXX"
  // Pattern: "GBP 8,99 Kurs 861,73 Nota nr. 33856 Audible UK, adbl.co/pymt"
  // or "HUF 3195,00 Kurs 1,9471 Nota nr. 49307 Google One, Dublin 2"
  const foreignCurrencyMatch = clean.match(/^(?:EUR|USD|CAD|GBP|HUF|SEK|NOK|CHF|PLN)\s+[\d,]+\s+Kurs\s+[\d,]+\s+Nota\s+(?:nr\.?\s*)?\d+\s+(.+)$/i);
  if (foreignCurrencyMatch) {
    // Extract merchant from after "Nota nr. XXXXX", split at comma to remove location
    const merchant = foreignCurrencyMatch[1].split(',')[0].trim();
    if (merchant) {
      return merchant.substring(0, 100);
    }
  }

  // Handle foreign transactions starting with numbers (e.g., "63250113 Hamburg Hbf, EUR 6,89...")
  // Pattern: leading digits followed by actual merchant name
  const foreignMatch = clean.match(/^\d{6,}\s+(.+?)(?:,\s*(?:EUR|USD|CAD|GBP|HUF|SEK|NOK|CHF|PLN)\s|$)/i);
  if (foreignMatch) {
    clean = foreignMatch[1].trim();
  }

  // Split at common suffixes (receipt numbers, agreement numbers, currency info)
  let payee = clean.split(/[,.]?\s*(Nota|Notanr|Aftalenr|beløb omregnet|EUR\s|USD\s|CAD\s|GBP\s|\d{6,})/i)[0].trim();

  // For "STORE, CITY" patterns, take just the store name
  if (payee.includes(',')) {
    payee = payee.split(',')[0].trim();
  }

  // Remove leading store/location numbers (e.g., "3127 MAXI ZOO" -> "MAXI ZOO", "A052 DK CPH La Place" -> "La Place")
  // Pattern: leading alphanumeric codes like "3127", "A052 DK CPH", "A410 DK AAR"
  payee = payee
    .replace(/^\d{3,5}\s+/i, '') // Remove 3-5 digit store numbers
    .replace(/^[A-Z]\d{2,3}\s+DK\s+[A-Z]{3}\s+/i, '') // Remove airport/station codes like "A052 DK CPH"
    .trim();

  // Limit length
  return payee.substring(0, 100);
}

// Register for common Danish banks
@BankProcessorFor([
  'DK_Sparekassen Kronjylland',
  'DK_Danske Bank',
  'DK_Nordea',
  'DK_Jyske Bank',
  'DK_Sydbank',
  'DK_Nykredit',
  'DK_Spar Nord',
  'DK_Arbejdernes Landsbank',
  'DK_Lån & Spar Bank',
  'DK_Ringkjøbing Landbobank',
  'DK_Vestjysk Bank',
  'DK_Djurslands Bank',
  'DK_Middelfart Sparekasse',
  'DK_Fynske Bank',
  'DK_Jutlander Bank',
  'DK_Kreditbanken',
  'DK_Den Jyske Sparekasse',
  'DK_Sparekassen Danmark',
  'DK_Lunar',
])
export class DanishBankProcessor extends FallbackBankProcessor {
  name = 'DanishBankProcessor';
  debug = false;

  normalizeTransaction(t: components['schemas']['Transaction']): Transaction {
    const isDebtor = t.credit_debit_indicator === 'DBIT';
    const payeeObject = isDebtor ? t.creditor : t.debtor;
    
    const notes = t.remittance_information
      ? t.remittance_information.join(' ')
      : '';

    // Use creditor/debtor name if available, otherwise extract from notes
    let payeeName = payeeObject?.name?.trim() || '';
    if (!payeeName && notes) {
      payeeName = extractPayeeFromNotes(notes);
    }

    // Clean metadata from notes for display
    const cleanNotes = notes.replace(/\s*\|\s*col\d+=.*$/i, '').trim();

    return {
      ...t,
      payeeObject,
      amount: parseFloat(t.transaction_amount.amount) * (isDebtor ? -1 : 1),
      payeeName,
      notes: cleanNotes,
      date: t.transaction_date ?? t.booking_date ?? t.value_date ?? '',
    };
  }
}
