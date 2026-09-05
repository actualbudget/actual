import { currentDay } from '@actual-app/core/shared/months';
import { describe, expect, it } from 'vitest';

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
      expect(result.value).toEqual(['category-id-123']);
    });

    it('should preserve single value when switching between single-value operators', () => {
      const state = {
        field: 'category' as const,
        op: 'is' as const,
        value: 'category-id-123',
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'contains',
      });

      expect(result.op).toBe('contains');
      expect(result.value).toBe('category-id-123');
    });
  });

  describe('when changing to and from "isbetween"', () => {
    it('should seed both bounds from the current date when switching to "isbetween"', () => {
      const state = {
        field: 'date' as const,
        op: 'is' as const,
        value: '2020-08-10',
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'isbetween',
      });

      expect(result.op).toBe('isbetween');
      expect(result.value).toEqual({ num1: '2020-08-10', num2: '2020-08-10' });
    });

    it('should seed both bounds from the current amount when switching to "isbetween"', () => {
      const state = {
        field: 'amount' as const,
        op: 'gt' as const,
        value: 1500,
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'isbetween',
      });

      expect(result.op).toBe('isbetween');
      expect(result.value).toEqual({ num1: 1500, num2: 1500 });
    });

    it('should fall back to today when a new date filter has no value yet', () => {
      const state = {
        field: 'date' as const,
        op: 'is' as const,
        value: '',
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'isbetween',
      });

      expect(result.value).toEqual({
        num1: currentDay(),
        num2: currentDay(),
      });
    });

    it('should fall back to zero when a new amount filter has no value yet', () => {
      const state = {
        field: 'amount' as const,
        op: 'is' as const,
        value: null,
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'isbetween',
      });

      expect(result.value).toEqual({ num1: 0, num2: 0 });
    });

    it('should keep the lower bound when switching away from "isbetween"', () => {
      const state = {
        field: 'date' as const,
        op: 'isbetween' as const,
        value: { num1: '2020-08-10', num2: '2020-08-20' },
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'gte',
      });

      expect(result.op).toBe('gte');
      expect(result.value).toBe('2020-08-10');
    });

    it('should keep the lower bound when switching an amount away from "isbetween"', () => {
      const state = {
        field: 'amount' as const,
        op: 'isbetween' as const,
        value: { num1: 1500, num2: 3000 },
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'lt',
      });

      expect(result.op).toBe('lt');
      expect(result.value).toBe(1500);
    });

    it('should fill in the missing bound of a half-formed date range', () => {
      const state = {
        field: 'date' as const,
        op: 'isbetween' as const,
        // A hand-edited or API-created filter can arrive with a single bound
        value: { num1: '2020-08-10' } as unknown as {
          num1: string;
          num2: string;
        },
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'isbetween',
      });

      expect(result.value).toEqual({ num1: '2020-08-10', num2: '2020-08-10' });
    });

    it('should fill in the missing bound of a half-formed amount range', () => {
      const state = {
        field: 'amount' as const,
        op: 'isbetween' as const,
        value: { num1: 1500 } as unknown as { num1: number; num2: number },
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'isbetween',
      });

      expect(result.value).toEqual({ num1: 1500, num2: 1500 });
    });

    it('should unwrap a half-formed range when switching away from "isbetween"', () => {
      const state = {
        field: 'amount' as const,
        op: 'isbetween' as const,
        value: { num1: 1500 } as unknown as { num1: number; num2: number },
      };

      const result = updateFilterReducer(state, { type: 'set-op', op: 'gt' });

      expect(result.op).toBe('gt');
      expect(result.value).toBe(1500);
    });

    it('should keep the only bound a half-formed range has when switching away', () => {
      const state = {
        field: 'date' as const,
        op: 'isbetween' as const,
        value: { num2: '2020-08-20' } as unknown as {
          num1: string;
          num2: string;
        },
      };

      const result = updateFilterReducer(state, { type: 'set-op', op: 'lt' });

      expect(result.op).toBe('lt');
      expect(result.value).toBe('2020-08-20');
    });

    it('should leave an existing range untouched when staying on "isbetween"', () => {
      const state = {
        field: 'date' as const,
        op: 'isbetween' as const,
        value: { num1: '2020-08-10', num2: '2020-08-20' },
      };

      const result = updateFilterReducer(state, {
        type: 'set-op',
        op: 'isbetween',
      });

      expect(result.value).toEqual({ num1: '2020-08-10', num2: '2020-08-20' });
    });
  });
});
