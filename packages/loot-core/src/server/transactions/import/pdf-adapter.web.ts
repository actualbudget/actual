// @ts-strict-ignore
/**
 * PDF Adapter - Claude AI Direct PDF Processing
 *
 * NEW ARCHITECTURE: Claude API processes PDFs directly (no pdfjs needed!)
 *
 * Flow:
 * 1. Read PDF as binary/base64 (no text extraction needed)
 * 2. Send PDF directly to Claude API with document attachment
 * 3. Claude reads PDF natively and extracts ALL data
 * 4. Map to Actual Budget format
 *
 * Features:
 * - NO pdfjs-dist (eliminates worker issues)
 * - Direct PDF reading by Claude (native support)
 * - Intelligent Payee curation
 * - Smart Category suggestions
 * - Complete transaction extraction with validation
 * - Confidence scoring
 */

import { logger } from '../../../platform/server/log';
import type { ParseFileResult } from './parse-file';

// Import new direct PDF processor
import { processPDFWithClaude } from './claude-pdf-processor';
import { mapClaudeToActual, validateTransactionCompleteness } from './transaction-mapper';

/**
 * Parse PDF file using Claude AI Direct PDF Processing
 *
 * NEW: No text extraction needed - Claude reads PDF directly!
 *
 * @param filepath - Path to the PDF file
 * @returns ParseFileResult with curated transactions
 */
export async function parsePDF(filepath: string): Promise<ParseFileResult> {
  logger.info('[PDF Adapter] Starting Claude AI Direct PDF Processing:', filepath);
  logger.info('[PDF Adapter] Architecture: PDF → Claude API (native PDF reading) → Structured Data');

  try {
    // STEP 1: Process PDF directly with Claude
    // Claude API has native PDF support - no need for pdfjs!
    logger.info('[PDF Adapter] Step 1: Sending PDF to Claude API for direct processing...');

    const claudeResponse = await processPDFWithClaude(filepath);

    if (!claudeResponse.success) {
      logger.error('[PDF Adapter] Claude processing failed:', claudeResponse.error);
      return {
        errors: [{
          message: 'AI processing failed: ' + (claudeResponse.error || 'Unknown error'),
          internal: claudeResponse.error,
        }],
        transactions: [],
      };
    }

    logger.info('[PDF Adapter] Claude processing successful:', {
      bank: claudeResponse.bankName,
      accountNumber: claudeResponse.accountNumber,
      transactions: claudeResponse.transactions.length,
      complete: claudeResponse.extractionComplete,
    });

    // STEP 2: Validate completeness
    logger.info('[PDF Adapter] Step 2: Validating transaction completeness...');
    const completeness = validateTransactionCompleteness(claudeResponse);

    if (!completeness.isComplete) {
      logger.warn('[PDF Adapter] Completeness warning:', completeness.message);
    }

    // STEP 3: Map to Actual Budget format
    logger.info('[PDF Adapter] Step 3: Mapping to Actual Budget format...');
    const result = mapClaudeToActual(claudeResponse);

    // Add completeness warning if needed
    if (!completeness.isComplete && result.errors.length === 0) {
      result.errors.push({
        message: completeness.message,
        internal: 'Completeness validation warning',
      });
    }

    logger.info('[PDF Adapter] PDF parsing complete:', {
      transactions: result.transactions.length,
      errors: result.errors.length,
    });

    // Log sample transactions for debugging
    if (result.transactions.length > 0) {
      logger.info('[PDF Adapter] Sample transactions:', result.transactions.slice(0, 3).map(tx => ({
        date: tx.date,
        payee: tx.payee_name,
        amount: tx.amount,
        category: tx.category,
      })));
    }

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[PDF Adapter] Fatal error during PDF parsing:', errorMessage);

    // Check if it's an API key error
    if (errorMessage.includes('API key') || errorMessage.includes('ANTHROPIC_API_KEY')) {
      return {
        errors: [{
          message: 'Claude API key not configured. Please add VITE_ANTHROPIC_API_KEY to your .env file.',
          internal: errorMessage,
        }],
        transactions: [],
      };
    }

    return {
      errors: [{
        message: 'Failed to parse PDF file',
        internal: errorMessage,
      }],
      transactions: [],
    };
  }
}
