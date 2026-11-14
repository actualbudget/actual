import {
  addTag,
  hasTag,
  isUnreviewed,
  markReviewedOnCategoryChange,
  removeTag,
  renameTagInNotes,
  setReviewed,
} from './tags';

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

describe('isUnreviewed', () => {
  test('is true only when the notes carry the unreviewed tag', () => {
    expect(isUnreviewed('Coffee #unreviewed')).toBe(true);
    expect(isUnreviewed('Coffee ##unreviewed')).toBe(false);
    expect(isUnreviewed('Coffee')).toBe(false);
    expect(isUnreviewed(null)).toBe(false);
  });
});

describe('setReviewed', () => {
  test('removes the tag when marking reviewed', () => {
    expect(setReviewed('Coffee #unreviewed', true)).toBe('Coffee');
    expect(setReviewed('Coffee', true)).toBe('Coffee');
  });

  test('adds the tag when marking unreviewed', () => {
    expect(setReviewed('Coffee', false)).toBe('Coffee #unreviewed');
    expect(setReviewed(null, false)).toBe('#unreviewed');
    expect(setReviewed('Coffee #unreviewed', false)).toBe('Coffee #unreviewed');
  });
});

describe('markReviewedOnCategoryChange', () => {
  const unreviewed = { category: 'food', notes: 'lunch #unreviewed' };

  test('removes the tag when the category changes', () => {
    expect(
      markReviewedOnCategoryChange(unreviewed, {
        ...unreviewed,
        category: 'fun',
      }),
    ).toEqual({ category: 'fun', notes: 'lunch' });
  });

  test('keeps the tag when the category is unchanged', () => {
    expect(markReviewedOnCategoryChange(unreviewed, unreviewed)).toBe(
      unreviewed,
    );
  });

  test('ignores split children, which never carry the tag', () => {
    const child = { ...unreviewed, category: 'fun', is_child: true };
    expect(markReviewedOnCategoryChange(unreviewed, child)).toBe(child);
  });

  test('does nothing without a previous version', () => {
    const next = { ...unreviewed, category: 'fun' };
    expect(markReviewedOnCategoryChange(undefined, next)).toBe(next);
  });
});
