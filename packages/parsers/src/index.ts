import fs from 'fs/promises';
import { parseCSV, parseOFX, parseQIF } from './fileParsers';
import { CSVParserOptions, ParserOptions, ParsingError, Transaction } from './types';

const VALID_EXTENSIONS = ['.qif', '.csv', '.ofx', '.qfx'] as const;
type ValidExtension = typeof VALID_EXTENSIONS[number];

export const extractFileExtension = (filepath: string): string | null => {
  if (typeof filepath !== 'string') return null;
  const match = filepath.match(/\.[^.]*$/);
  if (match === null) return null;

  return match[0].toLowerCase();
};

export async function parseFile(
  filepath: string,
  options?: ParserOptions
): Promise<{ errors: ParsingError[]; transactions: Transaction[] }> {
  const extension = extractFileExtension(filepath);

  if (VALID_EXTENSIONS.includes(extension as ValidExtension)) {
    const fileContents = await fs.readFile(filepath);

    switch (extension) {
      case '.qif':
        return parseQIF(fileContents);
      case '.csv':
        return parseCSV(fileContents, options as CSVParserOptions);
      case '.ofx':
      case '.qfx':
        return parseOFX(fileContents);
      default:
    }
  }

  return {
    errors: [
      {
        message: 'Invalid file type',
        internal: '',
      },
    ],
    transactions: [],
  };
}
