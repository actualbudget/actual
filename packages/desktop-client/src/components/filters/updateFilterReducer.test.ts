import { describe, it, expect } from 'vitest';

import { updateFilterReducer } from './updateFilterReducer';

describe('updateFilterReducer', () => {
  describe('when changing operators', () => {
    it('should convert single value to array when switching from "is" to "oneOf"', () => {
      const state = {
        field: 'category' as const,
        op: 'is' as const,
        value: 'category-id-123',
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'oneOf',
      });

      expect(result.op).toBe('oneOf');
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toEqual(['category-id-123']);
    });

    it('should convert single value to array when switching from "isNot" to "notOneOf"', () => {
      const state = {
        field: 'account' as const,
        op: 'isNot' as const,
        value: 'account-id-456',
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'notOneOf',
      });

      expect(result.op).toBe('notOneOf');
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toEqual(['account-id-456']);
    });

    it('should keep first element when switching from "oneOf" to "is" with multiple values', () => {
      const state = {
        field: 'category' as const,
        op: 'oneOf' as const,
        value: ['category-id-123', 'category-id-456'],
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'is',
      });

      expect(result.op).toBe('is');
      expect(result.value).toBe('category-id-123');
    });

    it('should keep first element when switching from "oneOf" to "is" with single value array', () => {
      const state = {
        field: 'category' as const,
        op: 'oneOf' as const,
        value: ['category-id-789'],
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'is',
      });

      expect(result.op).toBe('is');
      expect(result.value).toBe('category-id-789');
    });

    it('should handle empty array when switching from "oneOf" to "is"', () => {
      const state = {
        field: 'category' as const,
        op: 'oneOf' as const,
        value: [],
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'is',
      });

      expect(result.op).toBe('is');
      expect(result.value).toBe(null);
    });

    it('should keep first element when switching from "notOneOf" to "isNot"', () => {
      const state = {
        field: 'account' as const,
        op: 'notOneOf' as const,
        value: ['account-id-111', 'account-id-222'],
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'isNot',
      });

      expect(result.op).toBe('isNot');
      expect(result.value).toBe('account-id-111');
    });

    it('should handle null value when switching to "oneOf"', () => {
      const state = {
        field: 'category' as const,
        op: 'is' as const,
        value: null,
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'oneOf',
      });

      expect(result.op).toBe('oneOf');
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('should keep array value when already in array format for "oneOf"', () => {
      const state = {
        field: 'category' as const,
        op: 'oneOf' as const,
        value: ['category-id-123'],
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'notOneOf',
      });

      expect(result.op).toBe('notOneOf');
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toEqual(['category-id-123']);
    });

    it('should not convert value for notes field when switching to "oneOf"', () => {
      // The notes field is excluded from auto-conversion because it uses
      // string operators like 'contains' rather than 'oneOf'/'notOneOf'
      const state = {
        field: 'notes' as const,
        op: 'contains' as const,
        value: 'some note text',
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'oneOf',
      });

      expect(result.op).toBe('oneOf');
      // Notes field is excluded from auto-conversion in the current logic
      expect(result.value).toBe('some note text');
    });
  });
});
