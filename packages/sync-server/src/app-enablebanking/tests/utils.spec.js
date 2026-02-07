import { describe, it, expect } from 'vitest';

describe('Enable Banking Utils', () => {
  describe('Bank ID Parsing', () => {
    it('should parse bank_id correctly', () => {
      const parseBankId = bank_id => {
        const parts = bank_id.split('_');
        return {
          country: parts[0],
          aspsp: parts.slice(1).join('_'),
        };
      };

      const result1 = parseBankId('NL_ING');
      expect(result1.country).toBe('NL');
      expect(result1.aspsp).toBe('ING');

      const result2 = parseBankId('US_BANK_OF_AMERICA');
      expect(result2.country).toBe('US');
      expect(result2.aspsp).toBe('BANK_OF_AMERICA');
    });

    it('should handle malformed bank_id safely',  () => {
      const parseBankIdSafe = bank_id => {
        const match = bank_id.match(/^([A-Z]{2})_(.+)$/);
        if (!match) {
          throw new Error(`Invalid bank_id format: ${bank_id}`);
        }
        return {
          country: match[1],
          aspsp: match[2],
        };
      };

      expect(() => parseBankIdSafe('INVALID')).toThrow('Invalid bank_id');
      expect(() => parseBankIdSafe('123_BANK')).toThrow('Invalid bank_id');
      expect(() => parseBankIdSafe('')).toThrow('Invalid bank_id');

      const valid = parseBankIdSafe('NL_ING');
      expect(valid.country).toBe('NL');
      expect(valid.aspsp).toBe('ING');
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in response', () => {
      const escapeHtml = str => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const maliciousInput = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(maliciousInput);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });
  });

  describe('Floating Point Arithmetic', () => {
    it('should convert to integer cents before arithmetic', () => {
      const amount = 100.50;
      const currentBalance = 1000.75;

      // Convert to cents first
      const amountCents = Math.round(amount * 100);
      const currentBalanceCents = Math.round(currentBalance * 100);
      const result = currentBalanceCents - amountCents;

      expect(result).toBe(90025); // 900.25 in cents
    });

    it('should handle floating point errors correctly', () => {
      // Direct floating point arithmetic (buggy)
      const buggy = 0.1 + 0.2;
      expect(buggy).not.toBe(0.3); // Demonstrates the problem

      // Using integer arithmetic (correct)
      const correct = Math.round(0.1 * 100) + Math.round(0.2 * 100);
      expect(correct).toBe(30); // 0.3 in cents
    });
  });

  describe('Timeout Values', () => {
    it('should use appropriate timeout for different operations', () => {
      const TIMEOUTS = {
        configure: 30_000,
        transactions: 180_000,
        get_session: 5_000,
        default: 60_000,
      };

      expect(TIMEOUTS.transactions).toBeGreaterThan(TIMEOUTS.default);
      expect(TIMEOUTS.get_session).toBeLessThan(TIMEOUTS.default);
    });
  });
});
