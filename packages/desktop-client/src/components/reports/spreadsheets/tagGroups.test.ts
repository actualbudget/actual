import type { TagEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import type { QueryDataEntity } from '#components/reports/ReportOptions';

import { recalculate } from './recalculate';
import { groupQueryDataByTags, UNTAGGED_BUCKET_ID } from './tagGroups';

const tags: TagEntity[] = [
  { id: 'red-id', tag: 'red' },
  { id: 'circle-id', tag: 'circle' },
];

function row(notes: string | null, amount = 100): QueryDataEntity {
  return {
    date: '2026-01-01',
    category: 'category',
    categoryHidden: false,
    categoryGroup: 'group',
    categoryGroupHidden: false,
    account: 'account',
    accountOffBudget: false,
    payee: 'payee',
    transferAccount: '',
    notes,
    amount,
  };
}

describe('groupQueryDataByTags', () => {
  it('uses one bucket for distinct tags that collate equally in either order', () => {
    const result = groupQueryDataByTags({
      assets: [row('#é #é'), row('#é #é')],
      debts: [],
      tags: [
        { id: 'a', tag: 'é' },
        { id: 'b', tag: 'é' },
      ],
      showEmpty: false,
    });

    expect(result.groups).toHaveLength(1);
    expect(result.assets[0].tagBucketId).toBe(result.assets[1].tagBucketId);
  });

  it('puts each row in one stable canonical bucket without double-counting', () => {
    const result = groupQueryDataByTags({
      assets: [
        row('#red #circle #red', 125),
        row('#red #unmanaged', 75),
        row('#redder and ##red', 50),
      ],
      debts: [row(null, -40)],
      tags,
      showEmpty: false,
    });

    expect(result.groups).toEqual([
      expect.objectContaining({
        id: 'tag-group:circle-id:red-id',
        name: '#circle + #red',
        bucketTagNames: ['circle', 'red'],
      }),
      expect.objectContaining({
        id: 'tag-group:red-id',
        name: '#red',
        bucketTagNames: ['red'],
      }),
      expect.objectContaining({
        id: UNTAGGED_BUCKET_ID,
        name: 'Untagged',
        bucketTagNames: [],
      }),
    ]);
    const intervalTotals = result.groups.map(item =>
      recalculate({
        item,
        intervals: ['2026-01-01'],
        assets: result.assets,
        debts: result.debts,
        groupByLabel: 'tagBucketId',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
      }),
    );
    expect(
      intervalTotals.reduce((total, item) => total + item.totalTotals, 0),
    ).toBe(210);
  });

  it('reduces a combination to the selected tag and ignores unrelated tags', () => {
    const result = groupQueryDataByTags({
      assets: [row('#red #circle', 125), row('#circle', 25)],
      debts: [],
      tags: [tags[0]],
      showEmpty: false,
    });

    expect(result.assets.map(item => item.tagBucketId)).toEqual([
      'tag-group:red-id',
      UNTAGGED_BUCKET_ID,
    ]);
  });

  it('only synthesizes singleton and Untagged buckets for empty rows', () => {
    const result = groupQueryDataByTags({
      assets: [row('#red #circle')],
      debts: [],
      tags,
      showEmpty: true,
    });

    expect(result.groups.map(group => group.name)).toEqual([
      '#red',
      '#circle',
      'Untagged',
      '#circle + #red',
    ]);
  });
});
