import type { TagEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { calculateHasWarning } from './util';

const tags: TagEntity[] = [
  { id: 'visible-id', tag: 'visible' },
  { id: 'hidden-id', tag: 'hidden', hidden: true },
];

describe('calculateHasWarning tag scope', () => {
  const entities = { categories: [], accounts: [], payees: [], tags };

  it('accepts all tags and a selected visible tag', () => {
    expect(
      calculateHasWarning([], {
        ...entities,
        tagScope: { mode: 'all' },
      }),
    ).toBe(false);
    expect(
      calculateHasWarning([], {
        ...entities,
        tagScope: { mode: 'selected', tagIds: ['visible-id'] },
      }),
    ).toBe(false);
  });

  it('warns when a selected tag is missing or hidden', () => {
    expect(
      calculateHasWarning([], {
        ...entities,
        tagScope: {
          mode: 'selected',
          tagIds: ['visible-id', 'missing-id'],
        },
      }),
    ).toBe(true);
    expect(
      calculateHasWarning([], {
        ...entities,
        tagScope: { mode: 'selected', tagIds: ['hidden-id'] },
      }),
    ).toBe(true);
  });
});
