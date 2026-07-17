import { shouldApplyRuleChange } from './utils';

describe('shouldApplyRuleChange', () => {
  test('applies rule changes to empty fields', () => {
    expect(shouldApplyRuleChange('category', null, 'food')).toBe(true);
    expect(shouldApplyRuleChange('notes', '', 'memo')).toBe(true);
    expect(shouldApplyRuleChange('cleared', false, true)).toBe(true);
    expect(shouldApplyRuleChange('amount', 0, 1200)).toBe(true);
  });

  test('keeps user-entered values for non-empty fields by default', () => {
    expect(shouldApplyRuleChange('category', 'food', 'home')).toBe(false);
    expect(shouldApplyRuleChange('notes', 'manual note', 'rule note')).toBe(
      false,
    );
  });

  test('applies append and prepend notes rules', () => {
    expect(
      shouldApplyRuleChange('notes', 'Coffee and cake', 'Coffee and cake Tip'),
    ).toBe(true);
    expect(
      shouldApplyRuleChange('notes', 'Coffee and cake', 'Tip Coffee and cake'),
    ).toBe(true);
  });

  test('applies appends with no separator between the note and added text', () => {
    expect(shouldApplyRuleChange('notes', 'Coffee', 'CoffeePAID')).toBe(true);
  });

  test('applies a combined prepend and append in a single rule run', () => {
    expect(shouldApplyRuleChange('notes', 'Coffee', 'A Coffee B')).toBe(true);
  });

  test('is idempotent: does not re-append text already present', () => {
    // Rules re-run on every keystroke during entry; the second run sees the
    // already-appended note and must not append again.
    expect(
      shouldApplyRuleChange(
        'notes',
        'Coffee and cake Tip',
        'Coffee and cake Tip Tip',
      ),
    ).toBe(false);
    expect(
      shouldApplyRuleChange(
        'notes',
        'Tip Coffee and cake',
        'Tip Tip Coffee and cake',
      ),
    ).toBe(false);
  });

  test('does not apply when the rule replaces the note entirely', () => {
    expect(
      shouldApplyRuleChange('notes', 'manual note', 'completely different'),
    ).toBe(false);
  });

  test('only the notes field is allowed to merge', () => {
    expect(shouldApplyRuleChange('imported_payee', 'Store', 'Store Inc')).toBe(
      false,
    );
  });
});
