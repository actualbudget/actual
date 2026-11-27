import { extractTagsFromText, renameTagInNotes } from './tags';

describe('renameTagInNotes', () => {
  test('renames only whole, unescaped, case-sensitive tags', () => {
    expect(
      renameTagInNotes(
        '##Food #FoodCourt #food #Food#Work #Work#Food',
        'Food',
        'Groceries',
      ),
    ).toBe('##Food #FoodCourt #food #Groceries#Work #Work#Groceries');
  });

  test('treats regex and replacement characters literally', () => {
    expect(renameTagInNotes('#a.b #axb', 'a.b', '$&')).toBe('#$& #axb');
  });
});

describe('extractTagsFromText', () => {
  test('keeps adjacent and embedded tags, skipping escapes and duplicates', () => {
    expect(extractTagsFromText('##Food #Food#Work x#Embedded #Food')).toEqual([
      'Food',
      'Work',
      'Embedded',
    ]);
  });
});
