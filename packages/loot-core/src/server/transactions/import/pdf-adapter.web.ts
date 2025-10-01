// @ts-strict-ignore
import { logger } from '../../../platform/server/log';
import type { ParseFileResult } from './parse-file';

/**
 * PDF Adapter - Web version
 *
 * PDF parsing is not supported in the web version of Actual Budget.
 * PDF parsing requires Node.js libraries that are only available in the desktop (Electron) version.
 *
 * To use PDF import:
 * 1. Download and install the desktop version of Actual Budget
 * 2. Or convert your PDF to CSV/OFX format using your bank's export options
 */

/**
 * Parse PDF file - Web version (not supported)
 *
 * @param filepath - Path to the PDF file
 * @returns ParseFileResult with error message
 */
export async function parsePDF(filepath: string): Promise<ParseFileResult> {
  logger.warn('[PDF Adapter] PDF parsing is not supported in web version');

  return {
    errors: [
      {
        message: 'PDF import is only available in the desktop version',
        internal: 'PDF parsing requires Node.js libraries (pdf-parse) that are not available in the browser. Please use the desktop version of Actual Budget to import PDF bank statements, or export your transactions as CSV/OFX format instead.',
      },
    ],
    transactions: [],
  };
}
