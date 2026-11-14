import { addTag, hasTag, removeTag, renameTagInNotes } from './tags';

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

describe('hasTag', () => {
  test('matches only the whole, unescaped tag', () => {
    expect(hasTag('#unreviewed', 'unreviewed')).toBe(true);
    expect(hasTag('lunch #unreviewed#food', 'unreviewed')).toBe(true);
    expect(hasTag('##unreviewed', 'unreviewed')).toBe(false);
    expect(hasTag('#unreviewedx', 'unreviewed')).toBe(false);
    expect(hasTag(null, 'unreviewed')).toBe(false);
  });
});

describe('addTag', () => {
  test('appends the tag to existing notes', () => {
    expect(addTag('lunch ', 'unreviewed')).toBe('lunch #unreviewed');
  });

  test('uses the bare tag when there are no notes', () => {
    expect(addTag(null, 'unreviewed')).toBe('#unreviewed');
    expect(addTag('', 'unreviewed')).toBe('#unreviewed');
  });

  test('does not add the tag twice', () => {
    expect(addTag('a #unreviewed b', 'unreviewed')).toBe('a #unreviewed b');
  });
});

describe('removeTag', () => {
  test('removes the tag and tidies the spacing', () => {
    expect(removeTag('lunch #unreviewed with Sam', 'unreviewed')).toBe(
      'lunch with Sam',
    );
    expect(removeTag('#unreviewed #food', 'unreviewed')).toBe('#food');
  });

  test('returns an empty string when only the tag was left', () => {
    expect(removeTag('#unreviewed', 'unreviewed')).toBe('');
    expect(removeTag(null, 'unreviewed')).toBe('');
  });

  test('leaves escaped and longer tags alone', () => {
    expect(removeTag('##unreviewed #unreviewedx', 'unreviewed')).toBe(
      '##unreviewed #unreviewedx',
    );
  });
});

describe('removeTag whitespace handling', () => {
  test('leaves the rest of the notes untouched', () => {
    expect(removeTag('a  b #unreviewed', 'unreviewed')).toBe('a  b');
    expect(removeTag('  indented #unreviewed', 'unreviewed')).toBe(
      '  indented',
    );
  });

  test('does not leave a trailing space before a newline', () => {
    expect(removeTag('a #unreviewed\nb', 'unreviewed')).toBe('a\nb');
  });

  test('keeps the separator before a following tag', () => {
    expect(removeTag('lunch #unreviewed#food', 'unreviewed')).toBe(
      'lunch #food',
    );
  });

  test('undoes addTag', () => {
    const notes = 'a  b\tc';
    expect(removeTag(addTag(notes, 'unreviewed'), 'unreviewed')).toBe(notes);
  });

  test('returns an empty string when only whitespace is left', () => {
    expect(removeTag('  #unreviewed  ', 'unreviewed')).toBe('');
  });
});
