import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as db from '#server/db';

import { app } from './app';

vi.mock('#server/db');

describe('category-update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not require a name, since the API types fields as a Partial', async () => {
    // api/category-update spreads the caller's partial straight through, so a
    // caller changing only the group never sends `name`. Trimming it
    // unconditionally raised "Cannot read properties of undefined (reading
    // 'trim')" for every such update.
    await expect(
      app.handlers['category-update']({
        id: 'category-id',
        group: 'new-group-id',
      } as Parameters<(typeof app.handlers)['category-update']>[0]),
    ).resolves.not.toThrow();

    // db.update() writes only the keys it is handed, so `name` must be absent
    // rather than present-and-undefined, which would blank the column.
    const [updated] = vi.mocked(db.updateCategory).mock.calls[0];
    expect(updated).not.toHaveProperty('name');
    expect(updated).toMatchObject({ cat_group: 'new-group-id' });
  });

  it('still trims a name when one is supplied', async () => {
    await expect(
      app.handlers['category-update']({
        id: 'category-id',
        name: '  Groceries  ',
      } as Parameters<(typeof app.handlers)['category-update']>[0]),
    ).resolves.not.toThrow();

    const [updated] = vi.mocked(db.updateCategory).mock.calls[0];
    expect(updated).toMatchObject({ name: 'Groceries' });
  });
});
