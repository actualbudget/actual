// Helper function to extract merchant name from transaction description
// Based on sophisticated pattern matching for various transaction formats

function cleanMerchantName(name: string): string {
  let cleaned: string = name.trim();

  // Remove date patterns (MM/DD) and everything after
  cleaned = cleaned.replace(/\s+\d{1,2}\/\d{1,2}.*$/, '');

  // Remove hash/reference patterns (## or #) and everything after
  cleaned = cleaned.replace(/\s+##?.*$/, '');

  // Remove masked card numbers with last 4 digits (e.g., "xxxxxxxxxxxxxxxxxxx3910")
  cleaned = cleaned.replace(/\s+x+\d{4}\b/gi, '');

  // Remove masked numbers without digits (xxx, xxxx patterns)
  cleaned = cleaned.replace(/\s+x+\b/gi, '');

  // Remove trailing store/location numbers (space + digits at end)
  cleaned = cleaned.replace(/\s+\d{4,}$/g, '');

  // Remove trailing POS
  cleaned = cleaned.replace(/\s+POS$/i, '');

  // Preserve common merchant keywords that might look like state codes
  const hasGasKeyword: boolean = /\bGAS\b/i.test(cleaned);
  const hasConKeyword: boolean = /\bCON\b/i.test(cleaned);

  // Remove concatenated city+state patterns (e.g., "BOTHELLWA", "S.PORTLANDOR")
  // Matches word followed by 2-letter state code at end
  // But preserve if it contains GAS or CON (common in gas station names)
  if (!hasGasKeyword && !hasConKeyword) {
    cleaned = cleaned.replace(/\s+(?:[A-Z.]+\s+)*[A-Z.]+[A-Z]{2}$/i, '');
  }

  // Remove location patterns: "CITY STATE" or "CITY1 CITY2 STATE"
  // Examples: "REDMOND WA", "SOUTH PORTLAND OR", "S.PORTLAND OR"
  // But preserve if it contains GAS or CON
  if (!hasGasKeyword && !hasConKeyword) {
    cleaned = cleaned.replace(/\s+(?:[A-Z][a-z.]+\s+)*[A-Z]{2}$/i, '');
  }

  // Remove "Reversal Return -" prefix - just keep "Reversal Return"
  if (/^Reversal Return\s*-/i.test(cleaned)) {
    return 'Reversal Return';
  }

  // Limit length and trim
  cleaned = cleaned.substring(0, 50).trim();

  return cleaned || 'Unknown';
}

/**
 * Extract merchant name from description
 * Handles special bank fees, CHECKCARD patterns, and standard purchase formats
 */
export function extractMerchantName(description: string): string {
  if (!description) return 'Unknown';

  const line: string = description.trim();
  if (line.length === 0) return 'Unknown';

  // 1. Handle special bank fees and automated transactions
  if (/INSUFFICIENT FUNDS FEE/i.test(line)) {
    return 'Bank Fee: Insufficient Funds';
  }
  if (/OVERDRAFT PROTECTION/i.test(line)) {
    return 'Bank Transfer: Overdraft Protection';
  }
  if (/AUTO PAY WF HOME MTG/i.test(line)) {
    return 'Wells Fargo Home Mortgage';
  }
  if (/PAYDAY LOAN/i.test(line)) {
    return 'Payday Loan';
  }

  // 2. CHECKCARD Pattern
  // Extract merchant name after CHECKCARD ####
  const checkcardMatch: RegExpMatchArray | null = line.match(
    /CHECKCARD\s+\d{4}\s+(.+)/i,
  );
  if (checkcardMatch) {
    return cleanMerchantName(checkcardMatch[1]);
  }

  // 3. Extract merchant from start of description
  let merchantName: string = line;

  // Stop before DES: pattern (common in ACH/payroll transactions)
  merchantName = merchantName.replace(/\s+DES:.*/i, '');

  // Stop before PURCHASE keyword
  merchantName = merchantName.replace(/\s+PURCHASE\s+.*/i, '');

  // Stop before date patterns (MM/DD)
  merchantName = merchantName.replace(/\s+\d{2}\/\d{2}.*$/, '');

  // Stop before hash/reference patterns (## or #)
  merchantName = merchantName.replace(/\s+##?x*\d+.*$/, '');

  // Clean the extracted name
  return cleanMerchantName(merchantName);
}

/**
 * Suggest category based on merchant/description patterns
 */
export function suggestCategory(
  description: string,
  payeeName: string,
): string | null {
  const desc: string = (description || '').toLowerCase();
  const payee: string = (payeeName || '').toLowerCase();

  // Gas stations
  if (
    /\b(exxon|shell|chevron|bp|mobil|arco|texaco|sunoco|gulf|marathon|speedway|wawa|circle k|valero|76|conoco)\b/.test(
      payee,
    ) ||
    /\b(gas|fuel|gasoline)\b/.test(desc)
  ) {
    return 'Gas';
  }

  // Groceries
  if (
    /\b(walmart|target|costco|safeway|kroger|albertsons|publix|whole foods|trader joe|aldi|food|grocery|market|supermarket)\b/.test(
      payee,
    ) ||
    /\b(grocery|groceries|supermarket|food market)\b/.test(desc)
  ) {
    return 'Groceries';
  }

  // Restaurants
  if (
    /\b(restaurant|mcdonald|burger|pizza|starbucks|subway|chipotle|panera|cafe|coffee|dining|doordash|uber eats|grubhub)\b/.test(
      payee,
    ) ||
    /\b(restaurant|dining|cafe|coffee shop|food delivery)\b/.test(desc)
  ) {
    return 'Dining Out';
  }

  // Transportation
  if (
    /\b(uber|lyft|taxi|parking|toll|transit|metro|bus|train)\b/.test(payee) ||
    /\b(parking|toll|transit|transportation)\b/.test(desc)
  ) {
    return 'Transportation';
  }

  // Utilities
  if (
    /\b(electric|power|gas company|water|utility|comcast|at&t|verizon|internet|phone|cable)\b/.test(
      payee,
    ) ||
    /\b(electric|electricity|utility|water bill|internet|cable)\b/.test(desc)
  ) {
    return 'Utilities';
  }

  // Shopping
  if (
    /\b(amazon|ebay|etsy|shop|store|retail)\b/.test(payee) ||
    /\b(shopping|retail|store|online purchase)\b/.test(desc)
  ) {
    return 'Shopping';
  }

  // Entertainment
  if (
    /\b(netflix|hulu|spotify|apple music|disney|hbo|theater|cinema|movie)\b/.test(
      payee,
    ) ||
    /\b(entertainment|theater|cinema|movie|streaming|subscription)\b/.test(desc)
  ) {
    return 'Entertainment';
  }

  // Healthcare
  if (
    /\b(pharmacy|cvs|walgreens|rite aid|hospital|medical|doctor|dental|health)\b/.test(
      payee,
    ) ||
    /\b(pharmacy|medical|doctor|dental|hospital|healthcare|prescription)\b/.test(
      desc,
    )
  ) {
    return 'Healthcare';
  }

  // Insurance
  if (
    /\b(insurance|geico|state farm|progressive|allstate)\b/.test(payee) ||
    /\b(insurance|premium)\b/.test(desc)
  ) {
    return 'Insurance';
  }

  return null; // No category suggestion
}
