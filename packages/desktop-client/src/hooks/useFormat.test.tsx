import { type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { renderHook } from '@testing-library/react';

import { useFormat } from './useFormat';

import { store } from '@desktop-client/redux/store';

// Wrapper component to provide Redux store
const wrapper = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

describe('useFormat', () => {
  describe('basic formatting', () => {
    it('formats financial values with default currency', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      // Default currency should format correctly
      const formatted = result.current(12345, 'financial');
      expect(formatted).toMatch(/123\.45/); // May have currency symbol
    });

    it('formats string values', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      expect(result.current('test', 'string')).toBe('test');
    });

    it('formats number values', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(1234.56, 'number');
      expect(formatted).toMatch(/1,?234\.56/);
    });

    it('formats percentage values', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      expect(result.current(25, 'percentage')).toBe('25%');
    });
  });

  describe('currency-specific formatting', () => {
    it('formats USD amounts correctly', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(12345, 'financial', 'USD');
      expect(formatted).toBe('\u202A$\u202C123.45');
    });

    it('formats EUR amounts correctly', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(12345, 'financial', 'EUR');
      expect(formatted).toBe('\u202A€\u202C123,45');
    });

    it('formats GBP amounts correctly', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(12345, 'financial', 'GBP');
      expect(formatted).toBe('\u202A£\u202C123.45');
    });

    it('formats CHF amounts with apostrophe separator', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(123456789, 'financial', 'CHF');
      expect(formatted).toBe("\u202AFr.\u202C1'234'567.89");
    });

    it('formats SEK amounts with space separator', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(123456789, 'financial', 'SEK');
      expect(formatted).toBe('\u202Akr\u202C1\u202F234\u202F567,89');
    });

    it('formats INR amounts with Indian number format', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(123456789, 'financial', 'INR');
      expect(formatted).toBe('\u202A₹\u202C12,34,567.89');
    });

    it('formats empty currency without symbol', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(12345, 'financial', '');
      expect(formatted).toBe('123.45');
    });
  });

  describe('negative amounts', () => {
    it('formats negative USD amounts', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(-12345, 'financial', 'USD');
      expect(formatted).toBe('-\u202A$\u202C123.45');
    });

    it('formats negative EUR amounts', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(-12345, 'financial', 'EUR');
      expect(formatted).toBe('-\u202A€\u202C123,45');
    });
  });

  describe('financial-with-sign format', () => {
    it('adds plus sign for positive amounts', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(12345, 'financial-with-sign', 'USD');
      expect(formatted).toBe('+\u202A$\u202C123.45');
    });

    it('keeps minus sign for negative amounts', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(-12345, 'financial-with-sign', 'USD');
      expect(formatted).toBe('-\u202A$\u202C123.45');
    });

    it('adds plus sign for zero', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(0, 'financial-with-sign', 'USD');
      expect(formatted).toBe('+\u202A$\u202C0.00');
    });
  });

  describe('forEdit method', () => {
    it('formats for editing without currency symbol by default', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current.forEdit(12345);
      expect(formatted).toMatch(/123\.45/);
    });

    it('formats for editing with specific currency', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      // USD uses comma-dot format
      const usdFormatted = result.current.forEdit(12345, 'USD');
      expect(usdFormatted).toBe('123.45');

      // EUR uses dot-comma format
      const eurFormatted = result.current.forEdit(12345, 'EUR');
      expect(eurFormatted).toBe('123,45');
    });

    it('handles different decimal places correctly', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      // Standard 2 decimal places
      expect(result.current.forEdit(12345, 'USD')).toBe('123.45');

      // Zero amount
      expect(result.current.forEdit(0, 'USD')).toBe('0.00');

      // Small amount
      expect(result.current.forEdit(1, 'USD')).toBe('0.01');
    });
  });

  describe('fromEdit method', () => {
    it('parses edited values without currency code', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      expect(result.current.fromEdit('123.45')).toBe(12345);
      expect(result.current.fromEdit('0.01')).toBe(1);
      expect(result.current.fromEdit('0')).toBe(0);
    });

    it('parses edited values with specific currency', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      // USD format
      expect(result.current.fromEdit('123.45', null, 'USD')).toBe(12345);

      // EUR format (comma as decimal)
      expect(result.current.fromEdit('123,45', null, 'EUR')).toBe(12345);
    });

    it('handles empty strings', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      expect(result.current.fromEdit('')).toBeNull();
      expect(result.current.fromEdit('', 100)).toBe(100);
    });

    it('handles invalid input', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      expect(result.current.fromEdit('invalid')).toBeNull();
      expect(result.current.fromEdit('invalid', 100)).toBe(100);
    });

    it('supports arithmetic expressions', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      expect(result.current.fromEdit('100+23.45')).toBe(12345);
      expect(result.current.fromEdit('150-26.55')).toBe(12345);
    });
  });

  describe('backward compatibility', () => {
    it('works without currency parameter (uses default)', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      // All methods should work without currency parameter
      const formatted = result.current(12345, 'financial');
      expect(typeof formatted).toBe('string');

      const forEdit = result.current.forEdit(12345);
      expect(typeof forEdit).toBe('string');

      const fromEdit = result.current.fromEdit('123.45');
      expect(typeof fromEdit).toBe('number');
    });

    it('maintains currency property', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      expect(result.current.currency).toBeDefined();
      expect(result.current.currency).toHaveProperty('code');
      expect(result.current.currency).toHaveProperty('symbol');
      expect(result.current.currency).toHaveProperty('decimalPlaces');
    });
  });

  describe('edge cases', () => {
    it('handles zero amounts', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      expect(result.current(0, 'financial', 'USD')).toBe('\u202A$\u202C0.00');
      expect(result.current(0, 'financial', 'EUR')).toBe('\u202A€\u202C0,00');
    });

    it('handles very large amounts', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      const formatted = result.current(999999999, 'financial', 'USD');
      expect(formatted).toBe('\u202A$\u202C9,999,999.99');
    });

    it('handles very small amounts', () => {
      const { result } = renderHook(() => useFormat(), { wrapper });

      expect(result.current(1, 'financial', 'USD')).toBe('\u202A$\u202C0.01');
      expect(result.current(-1, 'financial', 'USD')).toBe('-\u202A$\u202C0.01');
    });
  });
});
