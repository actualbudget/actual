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

    it('should convert array to single value when switching from "oneOf" to "is"', () => {
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
      expect(result.value).toBe(null);
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
