import { shouldApplyRuleChange } from './utils';

describe('shouldApplyRuleChange', () => {
  test('allows rule changes for empty fields', () => {
    expect(shouldApplyRuleChange('category', null, 'food')).toBe(true);
    expect(shouldApplyRuleChange('notes', '', 'memo')).toBe(true);
    expect(shouldApplyRuleChange('cleared', false, true)).toBe(true);
  });

  test('keeps user-entered field values by default', () => {
    expect(shouldApplyRuleChange('category', 'food', 'home')).toBe(false);
    expect(shouldApplyRuleChange('notes', 'manual note', 'rule note')).toBe(
      false,
    );
  });

  test('allows note prepend and append rule changes', () => {
    expect(
      shouldApplyRuleChange('notes', 'manual note', 'rule: manual note'),
    ).toBe(true);
    expect(
      shouldApplyRuleChange('notes', 'manual note', 'manual note rule'),
    ).toBe(true);
  });
});
