import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseHTTPSConfig } from './app';

describe('parseHTTPSConfig', () => {
  it('converts escaped newlines in PEM values to real newlines', () => {
    const key =
      '-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkq\\n-----END PRIVATE KEY-----';
    const cert =
      '-----BEGIN CERTIFICATE-----\\nMIIDazCCAlOgAwIBAgIU\\n-----END CERTIFICATE-----';

    expect(parseHTTPSConfig(key)).toBe(
      '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq\n-----END PRIVATE KEY-----',
    );
    expect(parseHTTPSConfig(cert)).toBe(
      '-----BEGIN CERTIFICATE-----\nMIIDazCCAlOgAwIBAgIU\n-----END CERTIFICATE-----',
    );
  });

  it('leaves PEM values that already contain newlines unchanged', () => {
    const cert =
      '-----BEGIN CERTIFICATE-----\nMIIDazCCAlOgAwIBAgIU\n-----END CERTIFICATE-----';

    expect(parseHTTPSConfig(cert)).toBe(cert);
  });

  it('still reads the value from a file path', () => {
    const filePath = fileURLToPath(new URL('../package.json', import.meta.url));

    expect(parseHTTPSConfig(filePath)).toBeInstanceOf(Buffer);
  });
});
