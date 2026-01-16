import { describe, expect, it } from 'vitest';

import { getValidOps, isValidOp } from './rules';

describe('rules', () => {
  describe('isValidOp', () => {
    it('should return false for oneOf operation on notes field', () => {
      expect(isValidOp('notes', 'oneOf')).toBe(false);
    });

    it('should return false for notOneOf operation on notes field', () => {
      expect(isValidOp('notes', 'notOneOf')).toBe(false);
    });

    it('should return true for valid string operations on notes field', () => {
      expect(isValidOp('notes', 'is')).toBe(true);
      expect(isValidOp('notes', 'isNot')).toBe(true);
      expect(isValidOp('notes', 'contains')).toBe(true);
      expect(isValidOp('notes', 'doesNotContain')).toBe(true);
      expect(isValidOp('notes', 'matches')).toBe(true);
      expect(isValidOp('notes', 'hasTags')).toBe(true);
    });

    it('should return true for oneOf operation on payee field', () => {
      expect(isValidOp('payee', 'oneOf')).toBe(true);
    });

    it('should return true for notOneOf operation on payee field', () => {
      expect(isValidOp('payee', 'notOneOf')).toBe(true);
    });
  });

  describe('getValidOps', () => {
    it('should not include oneOf and notOneOf for notes field', () => {
      const validOps = getValidOps('notes');
      expect(validOps).not.toContain('oneOf');
      expect(validOps).not.toContain('notOneOf');
    });

    it('should include other valid string operations for notes field', () => {
      const validOps = getValidOps('notes');
      expect(validOps).toContain('is');
      expect(validOps).toContain('isNot');
      expect(validOps).toContain('contains');
      expect(validOps).toContain('doesNotContain');
      expect(validOps).toContain('matches');
      expect(validOps).toContain('hasTags');
    });

    it('should include oneOf and notOneOf for payee field', () => {
      const validOps = getValidOps('payee');
      expect(validOps).toContain('oneOf');
      expect(validOps).toContain('notOneOf');
    });
  });
});
