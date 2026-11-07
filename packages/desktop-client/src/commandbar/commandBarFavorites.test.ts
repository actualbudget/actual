import { describe, expect, it } from 'vitest';

import {
  favoriteRefKey,
  parseCommandBarFavorites,
  updateCommandBarFavorites,
} from './commandBarFavorites';

describe('command bar favorites', () => {
  it('migrates legacy domain favorites while preserving order and duplicates', () => {
    const favorites = parseCommandBarFavorites({
      version: 1,
      favorites: [
        { type: 'account', id: 'a' },
        { type: 'report', id: 'r' },
        { type: 'account', id: 'a' },
      ],
    });

    expect(favorites).toEqual([
      { type: 'account', id: 'a' },
      { type: 'report', id: 'r' },
    ]);
  });

  it('does not collide when owner and command ids contain delimiters', () => {
    const first = {
      type: 'page-action' as const,
      ownerId: 'a:b',
      commandId: 'c',
    };
    const second = {
      type: 'page-action' as const,
      ownerId: 'a',
      commandId: 'b:c',
    };
    expect(favoriteRefKey(first)).not.toBe(favoriteRefKey(second));
    expect(
      updateCommandBarFavorites({ version: 2, favorites: [first] }, [], second)
        .favorites,
    ).toEqual([first, second]);
  });
});
