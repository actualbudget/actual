// @ts-strict-ignore
import * as fs from '../../../platform/server/fs';
import { logger } from '../../../platform/server/log';
import type { ParseFileResult } from './parse-file';

/**
 * PDF Adapter - Extracts transactions from Spanish bank PDF statements
 *
 * Phase 1: Basic structure with placeholder for Claude Agent integration
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
 * Placeholder for Claude Agent integration
 *
 * TODO: Implement one of:
 * - Option A: Claude Code Extension API
 * - Option B: HTTP Bridge to Claude Agent
 * - Option C: Direct parsing with regex (recommended for Phase 2)
 */
async function extractTransactionsFromPDF(filepath: string): Promise<PDFParseResult> {
  logger.info('[PDF Adapter] Starting extraction for:', filepath);

  try {
    // Phase 1: Return placeholder response
    // Phase 2 will implement actual extraction logic

    logger.warn('[PDF Adapter] Using placeholder extraction - implement in Phase 2');

    return {
      bankName: 'Unknown',
      transactions: [],
      success: false,
      error: 'PDF extraction not yet implemented. This is Phase 1 setup only.',
    };
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
