import type {
  CustomReportTagScope,
  TagEntity,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { normalizeTagScope, resolveTagScope } from './tagScope';

const tags: TagEntity[] = [
  { id: 'red-id', tag: 'red' },
  { id: 'circle-id', tag: 'circle' },
  { id: 'hidden-id', tag: 'hidden', hidden: true },
];

describe('tag scope', () => {
  it('defaults missing and empty selections to all visible tags', () => {
    const scopes: (CustomReportTagScope | undefined)[] = [
      undefined,
      { mode: 'selected', tagIds: [] },
    ];
    for (const scope of scopes) {
      const normalized = normalizeTagScope(scope);
      expect(normalized).toEqual({ mode: 'all' });
      expect(resolveTagScope(tags, normalized)).toEqual(tags.slice(0, 2));
    }
  });

  it('retains saved IDs but excludes hidden or missing tags from grouping', () => {
    const scope = normalizeTagScope({
      mode: 'selected',
      tagIds: ['red-id', 'hidden-id', 'missing-id'],
    });
    expect(scope).toEqual({
      mode: 'selected',
      tagIds: ['red-id', 'hidden-id', 'missing-id'],
    });
    expect(resolveTagScope(tags, scope)).toEqual([tags[0]]);
  });
});
