// @ts-strict-ignore
/**
 * MODULE 3: Transaction Mapper
 *
 * Maps Claude Agent response to Actual Budget's ParseFileResult format.
 * Handles validation, error reporting, and format conversion.
 */

import { logger } from '../../../platform/server/log';
import type { ParseFileResult } from './parse-file';
import type { ClaudePDFResponse, ClaudeTransaction } from './claude-pdf-processor';

/**
 * Map Claude Agent response to Actual Budget transaction format
 *
 * @param claudeResponse - Response from Claude Agent
 * @returns ParseFileResult compatible with Actual Budget
 */
export function mapClaudeToActual(claudeResponse: ClaudePDFResponse): ParseFileResult {
  const errors: { message: string; internal: string }[] = [];

  // Check if Claude processing failed
  if (!claudeResponse.success) {
    const errorMsg = claudeResponse.error || 'Claude Agent failed to process PDF';
    logger.error('[Transaction Mapper] Claude processing failed:', errorMsg);

    errors.push({
      message: 'Failed to extract transactions from PDF',
      internal: errorMsg,
    });

    return { errors, transactions: [] };
  }

  // Validate extraction completeness
  if (!claudeResponse.extractionComplete) {
    logger.warn('[Transaction Mapper] Extraction may be incomplete');
    errors.push({
      message: 'PDF extraction may be incomplete. Please verify all transactions are present.',
      internal: `Found ${claudeResponse.transactions.length} transactions, but extraction marked as incomplete`,
    });
  }

  // Map transactions
  const transactions = claudeResponse.transactions.map((tx, index) => {
    return mapSingleTransaction(tx, claudeResponse.bankName, claudeResponse.accountNumber, index);
  });

  // Filter out invalid transactions
  const validTransactions = transactions.filter(tx => tx !== null) as any[];

  if (validTransactions.length === 0) {
    errors.push({
      message: 'No valid transactions found in PDF',
      internal: 'All transactions failed validation',
    });
  }

  // Log mapping summary
  logger.info('[Transaction Mapper] Mapped transactions:', {
    total: claudeResponse.transactions.length,
    valid: validTransactions.length,
    bank: claudeResponse.bankName,
    complete: claudeResponse.extractionComplete,
  });

  return {
    errors,
    transactions: validTransactions,
  };
}

/**
 * Map a single Claude transaction to Actual Budget format
 */
function mapSingleTransaction(
  tx: ClaudeTransaction,
  bankName: string,
  accountNumber?: string,
  index?: number
): any | null {
  try {
    // Validate required fields
    if (!tx.date) {
      logger.warn('[Transaction Mapper] Transaction missing date:', tx);
      return null;
    }

    if (!tx.payee || tx.payee.trim().length === 0) {
      logger.warn('[Transaction Mapper] Transaction missing payee:', tx);
      return null;
    }

    if (tx.amount === undefined || tx.amount === null || isNaN(tx.amount)) {
      logger.warn('[Transaction Mapper] Transaction missing or invalid amount:', tx);
      return null;
    }

    // Build notes with bank context
    const notesPrefix = accountNumber
      ? `[${bankName} - ${accountNumber}] `
      : `[${bankName}] `;

    const notes = tx.notes ? notesPrefix + tx.notes : notesPrefix + tx.payee;

    // Build confidence indicator (for debugging)
    const confidenceNote = tx.confidence && tx.confidence < 0.8
      ? ` (confidence: ${Math.round(tx.confidence * 100)}%)`
      : '';

    return {
      date: tx.date,
      payee_name: tx.payee,
      imported_payee: tx.payee,
      notes: notes + confidenceNote,
      // Category is suggested but not set (user will confirm)
      // We can add it as a note or custom field if needed
      category: tx.category || 'General',
      amount: tx.amount,
      // Store Claude's confidence for potential future use
      __claude_confidence: tx.confidence,
    };

  } catch (error) {
    logger.error('[Transaction Mapper] Error mapping transaction:', error, tx);
    return null;
  }
}

/**
 * Validate that all expected transactions are present
 *
 * @param claudeResponse - Response from Claude
 * @param expectedCount - Expected transaction count (if known)
 * @returns Validation result
 */
export function validateTransactionCompleteness(
  claudeResponse: ClaudePDFResponse,
  expectedCount?: number
): {
  isComplete: boolean;
  message: string;
  missingCount?: number;
} {
  const foundCount = claudeResponse.transactions.length;

  // Check Claude's own assessment
  if (!claudeResponse.extractionComplete) {
    return {
      isComplete: false,
      message: 'Claude Agent reports extraction may be incomplete',
    };
  }

  // Check against expected count if provided
  if (expectedCount !== undefined) {
    if (foundCount < expectedCount) {
      return {
        isComplete: false,
        message: `Only found ${foundCount} of ${expectedCount} expected transactions`,
        missingCount: expectedCount - foundCount,
      };
    }
  }

  // Check for low-confidence transactions
  const lowConfidenceCount = claudeResponse.transactions.filter(
    tx => tx.confidence && tx.confidence < 0.7
  ).length;

  if (lowConfidenceCount > 0) {
    return {
      isComplete: true,
      message: `Found ${foundCount} transactions, but ${lowConfidenceCount} have low confidence`,
    };
  }

  return {
    isComplete: true,
    message: `Successfully extracted all ${foundCount} transactions`,
  };
}

/**
 * Generate user-friendly error messages
 */
export function formatErrorMessage(
  claudeResponse: ClaudePDFResponse
): string {
  if (!claudeResponse.success) {
    return claudeResponse.error || 'Failed to process PDF';
  }

  const validation = validateTransactionCompleteness(claudeResponse);

  if (!validation.isComplete) {
    return validation.message;
  }

  return 'Success';
}
