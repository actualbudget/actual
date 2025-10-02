// @ts-strict-ignore
/**
 * Claude PDF Processor - Agent-Based PDF Processing
 *
 * NEW ARCHITECTURE: Uses Anthropic Agent Server
 *
 * Flow:
 * 1. Read PDF from virtual filesystem
 * 2. Send PDF to AGENT SERVER (localhost:4000)
 * 3. Agent Server processes with Claude API + Agent tools
 * 4. Returns structured transaction data
 *
 * Agent Server Architecture:
 * - Node.js server with @anthropic-ai/sdk
 * - Tools: PDF reader, transaction extractor, payee curator
 * - Logs visible of agent working
 * - Returns curated JSON
 */

import { logger } from '../../../platform/server/log';
import * as fs from '../../../platform/server/fs';

export type ClaudeTransaction = {
  date: string;
  payee: string;
  notes: string;
  category: string;
  amount: number;
  confidence: number;
};

export type ClaudePDFResponse = {
  bankName: string;
  accountNumber?: string;
  transactions: ClaudeTransaction[];
  totalTransactionsFound: number;
  extractionComplete: boolean;
  success: boolean;
  error?: string;
};

/**
 * Process PDF with Anthropic Agent Server
 *
 * Sends PDF to local Agent Server which uses Claude API with agent tools
 */
export async function processPDFWithClaude(filepath: string): Promise<ClaudePDFResponse> {
  logger.info('[Claude PDF Processor] Starting AGENT-based PDF processing:', filepath);
  logger.info('[Claude PDF Processor] Agent Server: http://localhost:4000');

  try {
    // Step 1: Read PDF file as binary
    const pdfData = await fs.readFile(filepath, 'binary');
    if (!pdfData || pdfData.length === 0) {
      throw new Error('PDF file is empty or could not be read');
    }

    logger.info('[Claude PDF Processor] PDF file read successfully, size:', pdfData.length, 'bytes');

    // Step 2: Create FormData to send PDF to Agent Server
    const formData = new FormData();

    // Convert pdfData to Blob
    let blob: Blob;
    if (pdfData instanceof Uint8Array) {
      blob = new Blob([pdfData], { type: 'application/pdf' });
    } else if (typeof pdfData === 'string') {
      // Binary string - convert to Uint8Array first
      const bytes = new Uint8Array(pdfData.length);
      for (let i = 0; i < pdfData.length; i++) {
        bytes[i] = pdfData.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'application/pdf' });
    } else {
      throw new Error(`Unsupported pdfData type: ${typeof pdfData}`);
    }

    formData.append('pdf', blob, 'statement.pdf');
    logger.info('[Claude PDF Processor] FormData prepared, sending to Agent Server...');

    // Step 3: Send to Agent Server
    const response = await fetch('http://localhost:4000/api/process-pdf', {
      method: 'POST',
      body: formData,
    });

    logger.info('[Claude PDF Processor] Agent Server response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Claude PDF Processor] Agent Server error:', errorText);
      throw new Error(`Agent Server error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    logger.info('[Claude PDF Processor] Agent Server returned JSON successfully');

    logger.info('[Claude PDF Processor] Successfully parsed', result.transactions.length, 'transactions');
    logger.info('[Claude PDF Processor] Bank:', result.bankName);
    logger.info('[Claude PDF Processor] Extraction complete:', result.extractionComplete);

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Claude PDF Processor] Processing failed:', errorMessage);

    return {
      bankName: 'Unknown',
      transactions: [],
      totalTransactionsFound: 0,
      extractionComplete: false,
      success: false,
      error: errorMessage,
    };
  }
}

// No additional helper functions needed - Agent Server handles everything
