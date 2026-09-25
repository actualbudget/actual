import { extractTagsFromText } from '@actual-app/core/shared/tags';
import type { TagEntity } from '@actual-app/core/types/models';
import { t } from 'i18next';

import type {
  QueryDataEntity,
  UncategorizedEntity,
} from '#components/reports/ReportOptions';

export const UNTAGGED_BUCKET_ID = 'tag-group:untagged';

const tagCollator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'variant',
});

function makeTagBucket(tags: TagEntity[]): UncategorizedEntity {
  if (tags.length === 0) {
    return {
      id: UNTAGGED_BUCKET_ID,
      name: t('Untagged'),
      hidden: false,
      bucketTagNames: [],
    };
  }

  const sortedTags = [...tags].sort(
    (a, b) => tagCollator.compare(a.tag, b.tag) || a.id.localeCompare(b.id),
  );

  return {
    id: `tag-group:${sortedTags.map(tag => tag.id).join(':')}`,
    name: sortedTags.map(tag => `#${tag.tag}`).join(' + '),
    hidden: false,
    bucketTagNames: sortedTags.map(tag => tag.tag),
  };
}

function assignTagBucket(
  row: QueryDataEntity,
  tagsByName: Map<string, TagEntity>,
  buckets: Map<string, UncategorizedEntity>,
): QueryDataEntity {
  const matchingTags = extractTagsFromText(row.notes ?? '')
    .map(tagName => tagsByName.get(tagName))
    .filter((tag): tag is TagEntity => tag !== undefined);
  const bucket = makeTagBucket(matchingTags);
  buckets.set(bucket.id, bucket);

  return { ...row, tagBucketId: bucket.id };
}

export function groupQueryDataByTags({
  assets,
  debts,
  tags,
  showEmpty,
}: {
  assets: QueryDataEntity[];
  debts: QueryDataEntity[];
  tags: TagEntity[];
  showEmpty: boolean;
}): {
  assets: QueryDataEntity[];
  debts: QueryDataEntity[];
  groups: UncategorizedEntity[];
} {
  const tagsByName = new Map(tags.map(tag => [tag.tag, tag]));
  const buckets = new Map<string, UncategorizedEntity>();

  if (showEmpty) {
    for (const tag of tags) {
      const bucket = makeTagBucket([tag]);
      buckets.set(bucket.id, bucket);
    }
    const untaggedBucket = makeTagBucket([]);
    buckets.set(untaggedBucket.id, untaggedBucket);
  }

  return {
    assets: assets.map(row => assignTagBucket(row, tagsByName, buckets)),
    debts: debts.map(row => assignTagBucket(row, tagsByName, buckets)),
    groups: [...buckets.values()],
  };
}
