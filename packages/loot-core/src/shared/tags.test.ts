import { renameTagInNotes } from './tags';

describe('renameTagInNotes', () => {
  test('renames a tag wherever it appears as a whole tag', () => {
    expect(
      renameTagInNotes(
        'Lunch #Reimbursable with #Work',
        'Reimbursable',
        'ToBeReimbursed',
      ),
    ).toBe('Lunch #ToBeReimbursed with #Work');
  });

  test('renames a tag at the start and end of the notes', () => {
    expect(renameTagInNotes('#Food', 'Food', 'Groceries')).toBe('#Groceries');
    expect(renameTagInNotes('#Food lunch #Food', 'Food', 'Groceries')).toBe(
      '#Groceries lunch #Groceries',
    );
  });

  test('does not rename tags that merely start with the same text', () => {
    expect(renameTagInNotes('#FoodCourt #Food', 'Food', 'Groceries')).toBe(
      '#FoodCourt #Groceries',
    );
  });

  test('renames tags adjacent to other tags', () => {
    expect(renameTagInNotes('#Food#Work', 'Food', 'Groceries')).toBe(
      '#Groceries#Work',
    );
    expect(renameTagInNotes('#Work#Food', 'Food', 'Groceries')).toBe(
      '#Work#Groceries',
    );
  });

  test('ignores escaped tags', () => {
    expect(renameTagInNotes('##Food', 'Food', 'Groceries')).toBe('##Food');
  });

  test('is case sensitive', () => {
    expect(renameTagInNotes('#food #Food', 'Food', 'Groceries')).toBe(
      '#food #Groceries',
    );
  });

  test('treats regex characters in the tag name literally', () => {
    expect(renameTagInNotes('#a.b #axb', 'a.b', 'c')).toBe('#c #axb');
    expect(renameTagInNotes('#a+b', 'a+b', 'c')).toBe('#c');
  });

  test('treats replacement tokens in the new name literally', () => {
    expect(renameTagInNotes('#Food', 'Food', '$&')).toBe('#$&');
    expect(renameTagInNotes('#Food', 'Food', "$'x$`")).toBe("#$'x$`");
  });

  test('leaves notes without the tag untouched', () => {
    expect(renameTagInNotes('nothing to see here', 'Food', 'Groceries')).toBe(
      'nothing to see here',
    );
  });
});
