import { describe, expect, test } from 'vitest';

import {
  BUDGET_IMPORT_EXTENSIONS,
  getExtensionFromUrl,
  getFilenameFromUrl,
  isFileOpenUrl,
  TRANSACTION_IMPORT_EXTENSIONS,
} from './mobileOpenDocument';

describe('mobileOpenDocument helpers', () => {
  test('parses extension and filename from file URLs', () => {
    const url = 'file:///private/var/mobile/Inbox/Statement.OFX';
    expect(getExtensionFromUrl(url)).toBe('ofx');
    expect(getFilenameFromUrl(url)).toBe('Statement.OFX');
  });

  test('decodes percent-encoded filenames', () => {
    const url = 'file:///tmp/My%20Export.zip';
    expect(getExtensionFromUrl(url)).toBe('zip');
    expect(getFilenameFromUrl(url)).toBe('My Export.zip');
  });

  test('detects file open URLs and ignores openid callbacks', () => {
    expect(isFileOpenUrl('file:///tmp/data.csv')).toBe(true);
    expect(isFileOpenUrl('actualbudget://localhost/openid-cb?code=abc')).toBe(
      false,
    );
    expect(isFileOpenUrl('actualbudget://localhost/inbox/data.qfx')).toBe(true);
    expect(isFileOpenUrl('https://example.com/file.csv')).toBe(false);
  });

  test('classifies import extensions', () => {
    expect(TRANSACTION_IMPORT_EXTENSIONS.has('csv')).toBe(true);
    expect(TRANSACTION_IMPORT_EXTENSIONS.has('ofx')).toBe(true);
    expect(BUDGET_IMPORT_EXTENSIONS.has('zip')).toBe(true);
    expect(BUDGET_IMPORT_EXTENSIONS.has('csv')).toBe(false);
  });
});
