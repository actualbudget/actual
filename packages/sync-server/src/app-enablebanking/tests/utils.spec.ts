import { describe, expect, it } from 'vitest';

import { escapeHtml } from '../app-enablebanking.js';

describe('Enable Banking Utils', () => {
  describe('XSS Prevention', () => {
    it('should escape HTML special characters', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(maliciousInput);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('A&B')).toBe('A&amp;B');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's a test")).toBe('It&#039;s a test');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('should escape less than and greater than', () => {
      expect(escapeHtml('<div>content</div>')).toBe(
        '&lt;div&gt;content&lt;/div&gt;',
      );
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should escape multiple special characters correctly', () => {
      const input = `<a href="javascript:alert('XSS')" onclick="alert('XSS')">Click & See</a>`;
      const expected = `&lt;a href=&quot;javascript:alert(&#039;XSS&#039;)&quot; onclick=&quot;alert(&#039;XSS&#039;)&quot;&gt;Click &amp; See&lt;/a&gt;`;
      expect(escapeHtml(input)).toBe(expected);
    });
  });
});
