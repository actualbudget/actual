// @ts-strict-ignore
import * as fs from '../../../platform/server/fs';
import { logger } from '../../../platform/server/log';
import type { ParseFileResult } from './parse-file';

// Import pdf-parse for text extraction
// @ts-expect-error - pdf-parse doesn't have TypeScript definitions
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

  if (lowerText.includes('santander') || lowerText.includes('banco santander')) {
    return 'santander';
  }

  if (lowerText.includes('revolut')) {
    return 'revolut';
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
 * Parse date string to YYYY-MM-DD format
 * Handles common Spanish date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 */
function parseDate(dateStr: string): string | null {
  // Remove extra whitespace
  const cleaned = dateStr.trim();

  // Pattern: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const match = cleaned.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Parse amount string to number
 * Handles Spanish format: 1.234,56 (thousands separator: dot, decimal: comma)
 * Returns negative for expenses, positive for income
 */
function parseAmount(amountStr: string): number | null {
  // Remove whitespace
  let cleaned = amountStr.trim();

  // Handle negative amounts in parentheses or with minus sign
  const isNegative = cleaned.includes('(') || cleaned.includes('-') || cleaned.includes('−');

  // Remove currency symbols, parentheses, and non-numeric chars except dots and commas
  cleaned = cleaned.replace(/[€$£\(\)\-−\s]/g, '');

  // Spanish format: 1.234,56 -> convert to 1234.56
  // Replace dots (thousands separator) with empty string
  cleaned = cleaned.replace(/\./g, '');
  // Replace comma (decimal separator) with dot
  cleaned = cleaned.replace(/,/g, '.');

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;

  return isNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Parse Santander PDF statement
 */
function parseSantanderPDF(text: string): PDFParseResult {
  logger.info('[PDF Adapter] Parsing Santander statement');

  const transactions: PDFTransaction[] = [];
  const accountNumber = extractAccountNumber(text, 'santander');

  // Santander typical format:
  // Date    Description    Amount    Balance
  // DD/MM/YYYY  Text...  -XXX,XX  XXX,XX

  // Split into lines and look for transaction patterns
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Pattern: Date at start of line (DD/MM/YYYY or DD-MM-YYYY)
    const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);

    if (dateMatch) {
      const dateStr = dateMatch[1];
      const date = parseDate(dateStr);

      if (!date) continue;

      // Rest of the line after date
      const restOfLine = line.substring(dateMatch[0].length).trim();

      // Amount patterns: Look for numbers with comma decimal separator
      // Typically at the end of the line: -1.234,56 or 1.234,56
      const amountMatch = restOfLine.match(/([\-−]?\d{1,3}(?:\.\d{3})*,\d{2})\s*(\d{1,3}(?:\.\d{3})*,\d{2})?\s*$/);

      if (amountMatch) {
        const amountStr = amountMatch[1];
        const balanceStr = amountMatch[2];

        const amount = parseAmount(amountStr);
        if (amount === null) continue;

        // Description is everything between date and amounts
        let description = restOfLine.substring(0, restOfLine.indexOf(amountStr)).trim();

        // Clean up common description artifacts
        description = description.replace(/\s+/g, ' ').trim();

        if (!description) {
          description = 'Transacción sin descripción';
        }

        const transaction: PDFTransaction = {
          date,
          description,
          amount,
        };

        if (balanceStr) {
          const balance = parseAmount(balanceStr);
          if (balance !== null) {
            transaction.balance = balance;
          }
        }

        transactions.push(transaction);
      }
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
 */
function parseRevolutPDF(text: string): PDFParseResult {
  logger.info('[PDF Adapter] Parsing Revolut statement');

  const transactions: PDFTransaction[] = [];
  const accountNumber = extractAccountNumber(text, 'revolut');

  // Revolut typical format:
  // Date    Description    Amount    Balance
  // MMM DD, YYYY  Text...  -€XXX.XX  €XXX.XX

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Pattern 1: Date at start (Revolut uses various formats)
    // Could be: DD/MM/YYYY, DD MMM YYYY, MMM DD YYYY, etc.
    let dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);

    // Pattern 2: Month name format (Jan 15, 2024)
    if (!dateMatch) {
      dateMatch = line.match(/^([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
    }

    if (dateMatch) {
      let dateStr = dateMatch[1];

      // Convert month name format to DD/MM/YYYY
      const monthNameMatch = dateStr.match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/);
      if (monthNameMatch) {
        const months: Record<string, string> = {
          Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
        };
        const month = months[monthNameMatch[1]];
        const day = monthNameMatch[2].padStart(2, '0');
        const year = monthNameMatch[3];
        dateStr = `${day}/${month}/${year}`;
      }

      const date = parseDate(dateStr);
      if (!date) continue;

      const restOfLine = line.substring(dateMatch[0].length).trim();

      // Revolut uses dots for thousands and comma for decimals (European format)
      // Or dots for decimals (UK/US format) depending on account settings
      // Pattern: €XXX.XX or €X,XXX.XX or -€XXX.XX
      const amountMatch = restOfLine.match(/([−\-]?[€$£]?\s*\d{1,3}(?:[,\.]\d{3})*[,\.]\d{2})\s*([€$£]?\s*\d{1,3}(?:[,\.]\d{3})*[,\.]\d{2})?\s*$/);

      if (amountMatch) {
        const amountStr = amountMatch[1];
        const balanceStr = amountMatch[2];

        const amount = parseAmount(amountStr);
        if (amount === null) continue;

        let description = restOfLine.substring(0, restOfLine.indexOf(amountStr)).trim();
        description = description.replace(/\s+/g, ' ').trim();

        if (!description) {
          description = 'Transaction without description';
        }

        const transaction: PDFTransaction = {
          date,
          description,
          amount,
        };

        if (balanceStr) {
          const balance = parseAmount(balanceStr);
          if (balance !== null) {
            transaction.balance = balance;
          }
        }

        transactions.push(transaction);
      }
    }
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
