// @ts-strict-ignore
import * as fs from '../../../platform/server/fs';
import { logger } from '../../../platform/server/log';
import type { ParseFileResult } from './parse-file';

// Import pdf-parse for text extraction
import pdfParse from 'pdf-parse';

/**
 * PDF Adapter - Extracts transactions from Spanish bank PDF statements
 *
 * Phase 2: Direct parsing implementation with regex patterns
 *
 * Supported banks:
 * - Santander España
 * - Revolut España
 */

type PDFTransaction = {
  date: string;        // YYYY-MM-DD format
  description: string; // Transaction description/payee
  amount: number;      // Negative for expenses, positive for income
  balance?: number;    // Account balance after transaction (optional)
};

type PDFParseResult = {
  bankName: string;
  accountNumber?: string;
  transactions: PDFTransaction[];
  success: boolean;
  error?: string;
};

/**
 * Detect which bank the PDF is from based on content markers
 */
function detectBank(text: string): 'santander' | 'revolut' | 'unknown' {
  const lowerText = text.toLowerCase();

  // Check Revolut first (takes priority as it may contain ES IBAN for transfers)
  if (lowerText.includes('revolut')) {
    return 'revolut';
  }

  // Santander patterns: "CUENTA" + Spanish IBAN, or "santander" text
  if (
    lowerText.includes('santander') ||
    lowerText.includes('banco santander') ||
    (lowerText.includes('cuenta') && /ES\d{22}/.test(text))
  ) {
    return 'santander';
  }

  return 'unknown';
}

/**
 * Extract account number from PDF text
 */
function extractAccountNumber(text: string, bankType: string): string | undefined {
  if (bankType === 'santander') {
    // Santander account format: ES XX XXXX XXXX XXXX XXXX XXXX or similar
    const ibanMatch = text.match(/ES\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/i);
    if (ibanMatch) return ibanMatch[0].replace(/\s/g, '');

    // Alternative: Last 4 digits pattern
    const accountMatch = text.match(/cuenta[^\d]*(\d{4})/i);
    if (accountMatch) return `****${accountMatch[1]}`;
  }

  if (bankType === 'revolut') {
    // Revolut shows account in various formats
    const ibanMatch = text.match(/ES\d{22}/i);
    if (ibanMatch) return ibanMatch[0];
  }

  return undefined;
}

/**
 * Spanish month names to numbers mapping
 */
const SPANISH_MONTHS: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04',
  may: '05', jun: '06', jul: '07', ago: '08',
  sep: '09', oct: '10', nov: '11', dic: '12'
};

/**
 * Parse date string to YYYY-MM-DD format
 * Handles Spanish date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, and "D MMM YYYY"
 */
function parseDate(dateStr: string): string | null {
  // Remove extra whitespace
  const cleaned = dateStr.trim();

  // Pattern 1: Numeric dates - DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const numericMatch = cleaned.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (numericMatch) {
    const day = numericMatch[1].padStart(2, '0');
    const month = numericMatch[2].padStart(2, '0');
    const year = numericMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Pattern 2: Spanish month format - "4 ago 2025"
  const spanishMatch = cleaned.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{4})/i);
  if (spanishMatch) {
    const day = spanishMatch[1].padStart(2, '0');
    const monthStr = spanishMatch[2].toLowerCase();
    const month = SPANISH_MONTHS[monthStr];
    const year = spanishMatch[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Parse amount string to number
 * Handles both formats:
 * - Spanish format: 1.234,56 (thousands separator: dot, decimal: comma) - Santander
 * - International format: €1,234.56 or €1234.56 (decimal: dot) - Revolut
 * Returns negative for expenses, positive for income
 */
function parseAmount(amountStr: string, bankType?: 'santander' | 'revolut'): number | null {
  // Remove whitespace
  let cleaned = amountStr.trim();

  // Handle negative amounts in parentheses or with minus sign
  const isNegative = cleaned.includes('(') || cleaned.includes('-') || cleaned.includes('−');

  // Remove currency symbols, parentheses, and non-numeric chars except dots and commas
  cleaned = cleaned.replace(/[€$£\(\)\-−\sEUR]/gi, '');

  if (!cleaned) return null;

  // Detect format based on presence of comma
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  let parsed: number;

  if (hasComma && hasDot) {
    // Has both: determine which is decimal separator
    const lastCommaPos = cleaned.lastIndexOf(',');
    const lastDotPos = cleaned.lastIndexOf('.');

    if (lastCommaPos > lastDotPos) {
      // Spanish format: 1.234,56 (dot=thousands, comma=decimal)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // International format: 1,234.56 (comma=thousands, dot=decimal)
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Only comma - Spanish decimal format: 123,45
    cleaned = cleaned.replace(',', '.');
  }
  // If only dot or neither, it's already in correct format

  parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;

  return isNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Parse Santander PDF statement
 * Real format has transactions in table:
 * "DD/MM/YYYY...Description...-XX,XX EURX.XXX,XX EUR"
 */
function parseSantanderPDF(text: string): PDFParseResult {
  logger.info('[PDF Adapter] Parsing Santander statement');

  const transactions: PDFTransaction[] = [];
  const accountNumber = extractAccountNumber(text, 'santander');

  // Pattern for table rows: [date]...[description][amount] EUR[balance] EUR
  // The pattern captures: date, description (limited length), amount, and balance
  // Example: "25/07/2025 Fecha valor:25/07/2025 Pago Movil...Madrid-15,13 EUR9.424,46 EUR"
  // Limit description to 200 chars to avoid greedy matching
  const tablePattern = /(\d{2}\/\d{2}\/\d{4})[^€]{1,200}?([\-−]?[\d.,]+)\s*EUR([\d.,]+)\s*EUR/gi;

  let match;
  const seenTransactions = new Set<string>();

  while ((match = tablePattern.exec(text)) !== null) {
    const dateStr = match[1];
    const amountStr = match[2];
    const balanceStr = match[3];

    // Parse date
    const date = parseDate(dateStr);
    if (!date) continue;

    // Parse amount
    const amount = parseAmount(amountStr, 'santander');
    if (amount === null) continue;

    // Parse balance
    const balance = parseAmount(balanceStr, 'santander');

    // Extract description - everything between date and amount
    const startPos = match.index;
    const fullMatch = match[0];
    const dateEndPos = fullMatch.indexOf(dateStr) + dateStr.length;
    const amountStartPos = fullMatch.lastIndexOf(amountStr);

    let description = fullMatch.substring(dateEndPos, amountStartPos).trim();

    // Clean up description
    description = description
      .replace(/Fecha valor:\d{2}\/\d{2}\/\d{4}/g, '') // Remove "Fecha valor:XX/XX/XXXX"
      .replace(/Tarj\.\s*:\*\d+/gi, '') // Remove "Tarj. :*XXXXXX"
      .replace(/Tarjeta\s+\d+/gi, '') // Remove "Tarjeta XXXXXXXXXX"
      .replace(/Comision\s+[\d.,]+/gi, '') // Remove "Comision X.XX"
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/,$/, '') // Remove trailing comma
      .trim();

    if (!description || description.length < 3) {
      description = 'Transacción sin descripción';
    }

    // Create unique key to avoid duplicates
    const txKey = `${date}-${amount}-${description.substring(0, 20)}`;
    if (seenTransactions.has(txKey)) continue;
    seenTransactions.add(txKey);

    const transaction: PDFTransaction = {
      date,
      description,
      amount,
    };

    if (balance !== null) {
      transaction.balance = balance;
    }

    transactions.push(transaction);
  }

  // Pattern 2: Header line format "Saldo:X EUR a fechaDD/MM/YYYYDescription:XX EUR"
  if (transactions.length === 0) {
    logger.info('[PDF Adapter] Trying header pattern for Santander');

    const headerPattern = /Saldo:([\d.,]+)\s*EUR[^a]*a\s*fecha(\d{2}\/\d{2}\/\d{4})([^:]+):([\d.,\-−]+)\s*EUR/gi;

    while ((match = headerPattern.exec(text)) !== null) {
      const balanceStr = match[1];
      const dateStr = match[2];
      let description = match[3];
      const amountStr = match[4];

      const date = parseDate(dateStr);
      if (!date) continue;

      const amount = parseAmount(amountStr, 'santander');
      if (amount === null) continue;

      description = description
        .replace(/\s+/g, ' ')
        .replace(/\([^)]*\)/g, '')
        .trim();

      if (!description) description = 'Transacción sin descripción';

      const balance = parseAmount(balanceStr, 'santander');

      const transaction: PDFTransaction = {
        date,
        description,
        amount,
      };

      if (balance !== null) {
        transaction.balance = balance;
      }

      transactions.push(transaction);
    }
  }

  logger.info(`[PDF Adapter] Found ${transactions.length} Santander transactions`);

  return {
    bankName: 'Santander España',
    accountNumber,
    transactions,
    success: transactions.length > 0,
    error: transactions.length === 0 ? 'No transactions found in Santander PDF' : undefined,
  };
}

/**
 * Parse Revolut PDF statement
 * Real format from table: "3 jul 20254 jul 2025Farmacia Pe40€9.90€90.10"
 * Pattern: [date1][date2][description]€[amount]€[balance]
 */
function parseRevolutPDF(text: string): PDFParseResult {
  logger.info('[PDF Adapter] Parsing Revolut statement');

  const transactions: PDFTransaction[] = [];
  const accountNumber = extractAccountNumber(text, 'revolut');

  // Spanish month date format: "3 jul 2025"
  const dateRegex = '\\d{1,2}\\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\\s+\\d{4}';

  // Pattern: [date1][date2][description]€[amount]€[balance]
  // Limit description to avoid greedy matching
  const transactionPattern = new RegExp(
    `(${dateRegex})(${dateRegex})([^€]{1,150}?)€([\\d.,]+)€([\\d.,]+)`,
    'gi'
  );

  let match;
  const seenTransactions = new Set<string>();

  while ((match = transactionPattern.exec(text)) !== null) {
    const processingDateStr = match[1];
    const transactionDateStr = match[2];
    let description = match[3];
    const amountStr = match[4];
    const balanceStr = match[5];

    // Use transaction date (second date) - this is when the transaction actually occurred
    let date = parseDate(transactionDateStr);
    if (!date) {
      date = parseDate(processingDateStr);
      if (!date) continue;
    }

    // Parse amount - Revolut uses dot as decimal separator
    const amount = parseAmount('€' + amountStr, 'revolut');
    if (amount === null) continue;

    // Clean description
    description = description
      .replace(/\s+/g, ' ')
      .replace(/^Pago de /i, '') // Remove "Pago de" prefix
      .replace(/^De /i, '') // Remove "De" prefix
      .replace(/^A /i, '') // Remove "A" prefix
      .replace(/Tarjeta:.*$/i, '') // Remove card info
      .trim();

    // Split on newlines and take first line as description
    const lines = description.split('\n');
    if (lines.length > 0) {
      description = lines[0].trim();
    }

    if (!description || description.length < 2) {
      description = 'Transaction without description';
    }

    // Parse balance
    const balance = parseAmount('€' + balanceStr, 'revolut');

    // Avoid duplicates
    const txKey = `${date}-${amount}-${description.substring(0, 20)}`;
    if (seenTransactions.has(txKey)) continue;
    seenTransactions.add(txKey);

    const transaction: PDFTransaction = {
      date,
      description,
      amount: -Math.abs(amount), // Revolut shows expenses as positive, convert to negative
    };

    if (balance !== null) {
      transaction.balance = balance;
    }

    transactions.push(transaction);
  }

  logger.info(`[PDF Adapter] Found ${transactions.length} Revolut transactions`);

  return {
    bankName: 'Revolut',
    accountNumber,
    transactions,
    success: transactions.length > 0,
    error: transactions.length === 0 ? 'No transactions found in Revolut PDF' : undefined,
  };
}

/**
 * Extract transactions from PDF using direct parsing
 */
async function extractTransactionsFromPDF(filepath: string): Promise<PDFParseResult> {
  logger.info('[PDF Adapter] Starting extraction for:', filepath);

  try {
    // Read PDF file as buffer
    const fileBuffer = await fs.readFile(filepath, 'binary');

    if (!fileBuffer) {
      throw new Error('Failed to read PDF file');
    }

    // Convert to Buffer if needed
    const buffer = Buffer.isBuffer(fileBuffer)
      ? fileBuffer
      : Buffer.from(fileBuffer as any, 'binary');

    // Extract text using pdf-parse
    logger.info('[PDF Adapter] Extracting text from PDF...');
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      throw new Error('PDF contains no extractable text');
    }

    logger.info(`[PDF Adapter] Extracted ${text.length} characters of text`);

    // Detect bank
    const bankType = detectBank(text);
    logger.info(`[PDF Adapter] Detected bank: ${bankType}`);

    // Parse based on bank type
    switch (bankType) {
      case 'santander':
        return parseSantanderPDF(text);

      case 'revolut':
        return parseRevolutPDF(text);

      default:
        return {
          bankName: 'Unknown',
          transactions: [],
          success: false,
          error: 'Could not detect bank type. Only Santander and Revolut PDFs are supported.',
        };
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[PDF Adapter] Extraction failed:', errorMessage);

    return {
      bankName: 'Unknown',
      transactions: [],
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Maps PDF transactions to Actual Budget transaction format
 */
function mapToActualTransactions(
  pdfResult: PDFParseResult,
): Array<{
  amount: number;
  date: string;
  payee_name: string | null;
  imported_payee: string | null;
  notes: string | null;
}> {
  return pdfResult.transactions
    .filter(t => t.date && typeof t.amount === 'number')
    .map(t => ({
      amount: t.amount,
      date: t.date,
      payee_name: t.description || null,
      imported_payee: t.description || null,
      notes: pdfResult.accountNumber
        ? `Imported from ${pdfResult.bankName} (${pdfResult.accountNumber})`
        : `Imported from ${pdfResult.bankName}`,
    }));
}

/**
 * Main entry point: Parse PDF bank statement and extract transactions
 *
 * @param filepath - Path to the PDF file
 * @returns ParseFileResult with transactions or errors
 */
export async function parsePDF(filepath: string): Promise<ParseFileResult> {
  logger.info('[PDF Adapter] parsePDF called for:', filepath);

  const errors: Array<{ message: string; internal: string }> = [];

  try {
    // Validate file exists and can be read
    const fileBuffer = await fs.readFile(filepath, 'binary');

    if (!fileBuffer || (Buffer.isBuffer(fileBuffer) && fileBuffer.length === 0)) {
      throw new Error('PDF file is empty or could not be read');
    }

    logger.info('[PDF Adapter] PDF file read successfully');

    // Extract transactions using appropriate method
    const pdfResult = await extractTransactionsFromPDF(filepath);

    // Check for extraction errors
    if (!pdfResult.success) {
      throw new Error(pdfResult.error || 'Failed to extract transactions from PDF');
    }

    // Map to Actual Budget format
    const transactions = mapToActualTransactions(pdfResult);

    logger.info(
      '[PDF Adapter] Successfully extracted',
      transactions.length,
      'transactions from',
      pdfResult.bankName,
    );

    return { errors, transactions };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[PDF Adapter] parsePDF failed:', errorMessage);

    errors.push({
      message: 'Failed to extract transactions from PDF',
      internal: errorMessage,
    });

    return { errors, transactions: [] };
  }
}
