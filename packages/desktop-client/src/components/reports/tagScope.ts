import type {
  CustomReportTagScope,
  TagEntity,
} from '@actual-app/core/types/models';

export function normalizeTagScope(
  scope: CustomReportTagScope | null | undefined,
): CustomReportTagScope {
  if (!scope || (scope.mode === 'selected' && scope.tagIds.length === 0)) {
    return { mode: 'all' };
  }

  return scope;
}

export function resolveTagScope(
  tags: TagEntity[],
  tagScope: CustomReportTagScope | undefined,
): TagEntity[] {
  const visibleTags = tags.filter(tag => !tag.hidden);
  const scope = normalizeTagScope(tagScope);
  if (scope.mode === 'all') {
    return visibleTags;
  }

  const tagsById = new Map(visibleTags.map(tag => [tag.id, tag]));
  return scope.tagIds
    .map(id => tagsById.get(id))
    .filter((tag): tag is TagEntity => tag !== undefined);
}
