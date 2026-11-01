import type {
  CategoryEntity,
  CategoryGroupEntity,
  DataEntity,
  GroupedEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import { renderHook } from '@testing-library/react';

import type { QueryDataEntity } from '#components/reports/ReportOptions';
import { SpreadsheetProvider, useSpreadsheet } from '#hooks/useSpreadsheet';

import { createCustomSpreadsheet } from './custom-spreadsheet';
import type { createCustomSpreadsheetProps } from './custom-spreadsheet';
import { fetchSpreadsheetQueryData } from './fetchSpreadsheetQueryData';
import { createGroupedSpreadsheet } from './grouped-spreadsheet';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn().mockResolvedValue({ filters: [] }),
  listen: vi.fn(() => vi.fn()),
}));
vi.mock('./fetchSpreadsheetQueryData');

const list: CategoryEntity[] = [
  { id: 'rent', name: 'Rent', group: 'bills' },
  { id: 'utilities', name: 'Utilities', group: 'bills' },
  { id: 'food', name: 'Food', group: 'expenses' },
  { id: 'hidden', name: 'Hidden category', group: 'bills', hidden: true },
  {
    id: 'hidden-group-child',
    name: 'Hidden group child',
    group: 'hidden-group',
  },
];
const grouped: CategoryGroupEntity[] = [
  { id: 'bills', name: 'Bills' },
  { id: 'expenses', name: 'Expenses' },
  { id: 'hidden-group', name: 'Hidden group', hidden: true },
].map(group => ({
  ...group,
  categories: list.filter(category => category.group === group.id),
}));
const categories = { list, grouped };
const defaults: createCustomSpreadsheetProps = {
  startDate: '2026-01',
  endDate: '2026-02',
  interval: 'Monthly',
  categories,
  conditions: [],
  conditionsOp: 'and',
  showEmpty: true,
  showOffBudget: false,
  showHiddenCategories: false,
  showUncategorized: false,
  trimIntervals: false,
  balanceTypeOp: 'totalDebts',
  sortByOp: 'name',
};
const rent: QueryDataEntity = {
  date: '2026-01',
  category: 'rent',
  categoryHidden: false,
  categoryGroup: 'bills',
  categoryGroupHidden: false,
  account: 'account',
  accountOffBudget: false,
  payee: '',
  transferAccount: '',
  amount: -100,
};

async function build(
  overrides: Partial<createCustomSpreadsheetProps> = {},
  expectedTotal = -100,
) {
  const props = { ...defaults, ...overrides };
  const original = structuredClone(categories);
  const { result, unmount } = renderHook(useSpreadsheet, {
    wrapper: SpreadsheetProvider,
  });
  const setGrouped = vi.fn<(data: GroupedEntity[]) => void>();
  await createGroupedSpreadsheet(props)(result.current, setGrouped);
  const groups = setGrouped.mock.calls[0][0];
  const custom: DataEntity[] = [];
  for (const groupBy of ['Category', 'Group', 'CategoryGroup']) {
    const setCustom = vi.fn<(data: DataEntity) => void>();
    await createCustomSpreadsheet({ ...props, groupBy })(
      result.current,
      setCustom,
    );
    custom.push(setCustom.mock.calls[0][0]);
  }
  unmount();
  expect(categories).toEqual(original);
  expect(custom[1].data?.map(row => row.name)).toEqual(
    groups.map(row => row.name),
  );
  expect(custom[2].data?.map(row => row.name)).toEqual(
    groups.map(row => row.name),
  );
  expect(custom[0].data?.map(row => row.name).sort()).toEqual(
    groups
      .flatMap(group => group.categories?.map(row => row.name) ?? [])
      .sort(),
  );
  expect(custom.map(data => data.totalDebts)).toEqual([
    expectedTotal,
    expectedTotal,
    expectedTotal,
  ]);
  expect(groups.reduce((total, group) => total + group.totalDebts, 0)).toBe(
    expectedTotal,
  );
  return { groups, rows: custom[0].data ?? [] };
}

beforeEach(() => {
  // Query conditions already restrict transactions. Row eligibility must also
  // work for categories that have no transaction results at all.
  vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
    assets: [],
    debts: [rent],
  });
});

it.each([true, false])(
  'keeps only selected Bills rows with showEmpty=%s',
  async showEmpty => {
    const { groups, rows } = await build({
      conditions: [
        { field: 'category', op: 'oneOf', value: ['rent', 'utilities'] },
      ],
      showEmpty,
    });
    expect(groups.map(row => row.name)).toEqual(['Bills']);
    expect(rows.map(row => row.name)).toEqual(
      showEmpty ? ['Rent', 'Utilities'] : ['Rent'],
    );
  },
);

it('excludes hidden categories/groups and disabled special rows even when empty rows are shown', async () => {
  const { rows } = await build();
  expect(rows.map(row => row.name)).toEqual(['Food', 'Rent', 'Utilities']);
});

it.each([
  { showOffBudget: true, names: ['Food', 'Off budget', 'Rent', 'Utilities'] },
  {
    showUncategorized: true,
    names: ['Food', 'Rent', 'Transfers', 'Uncategorized', 'Utilities'],
  },
  {
    showHiddenCategories: true,
    names: [
      'Food',
      'Hidden category',
      'Hidden group child',
      'Rent',
      'Utilities',
    ],
  },
])(
  'allows eligible empty rows when visibility is enabled: %j',
  async ({ names, ...options }) => {
    const { rows } = await build(options);
    expect(rows.map(row => row.name)).toEqual(names);
  },
);

it('does not add uncategorized or transfer rows to a category selection', async () => {
  const { rows } = await build({
    conditions: [
      { field: 'category', op: 'oneOf', value: ['rent', 'utilities'] },
    ],
    showUncategorized: true,
  });
  expect(rows.map(row => row.name)).toEqual(['Rent', 'Utilities']);
});

type ConditionCase = {
  conditions: RuleConditionEntity[];
  conditionsOp?: string;
  names: string[];
};
it.each<ConditionCase>([
  {
    conditions: [{ field: 'category', op: 'is', value: 'rent' }],
    names: ['Rent'],
  },
  {
    conditions: [{ field: 'category', op: 'isNot', value: 'food' }],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [{ field: 'category', op: 'notOneOf', value: ['food'] }],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [{ field: 'category', op: 'contains', value: 'RE' }],
    names: ['Rent'],
  },
  {
    conditions: [{ field: 'category', op: 'doesNotContain', value: 'food' }],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [
      { field: 'category', op: 'matches', value: '^(Rent|Utilities)$' },
    ],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [{ field: 'category_group', op: 'is', value: 'bills' }],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [{ field: 'category_group', op: 'oneOf', value: ['bills'] }],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [
      { field: 'category_group', op: 'notOneOf', value: ['expenses'] },
    ],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [{ field: 'category_group', op: 'isNot', value: 'expenses' }],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [{ field: 'category_group', op: 'contains', value: 'BILL' }],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [
      { field: 'category_group', op: 'doesNotContain', value: 'Expenses' },
    ],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [{ field: 'category_group', op: 'matches', value: '^Bills$' }],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [
      { field: 'category_group', op: 'is', value: 'bills' },
      { field: 'category', op: 'isNot', value: 'utilities' },
    ],
    names: ['Rent'],
  },
  {
    conditions: [
      { field: 'category', op: 'is', value: 'rent' },
      { field: 'category', op: 'is', value: 'utilities' },
    ],
    conditionsOp: 'or',
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [
      { field: 'category_group', op: 'is', value: 'bills' },
      { field: 'notes', op: 'contains', value: 'test' },
    ],
    conditionsOp: 'or',
    names: ['Food', 'Rent', 'Utilities'],
  },
  {
    conditions: [
      { field: 'category_group', op: 'is', value: 'bills' },
      { field: 'notes', op: 'contains', value: 'test' },
    ],
    names: ['Rent', 'Utilities'],
  },
  {
    conditions: [
      {
        field: 'category',
        op: 'is',
        value: 'food',
        customName: 'Saved filter',
      },
    ],
    names: ['Food', 'Rent', 'Utilities'],
  },
])(
  'respects category condition semantics: %j',
  async ({ names, ...options }) => {
    const { rows } = await build(options);
    expect(rows.map(row => row.name)).toEqual(names);
  },
);

it.each([true, false])(
  'keeps synthetic activity and totals with showEmpty=%s',
  async showEmpty => {
    vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
      assets: [],
      debts: [
        rent,
        { ...rent, category: null, categoryGroup: '', amount: -25 },
        {
          ...rent,
          category: null,
          categoryGroup: '',
          transferAccount: 'other-account',
          amount: -20,
        },
        { ...rent, accountOffBudget: true, amount: -30 },
      ],
    });
    const { rows } = await build(
      { showEmpty, showUncategorized: true, showOffBudget: true },
      -175,
    );
    expect(
      rows.filter(row => row.totalDebts !== 0).map(row => row.name),
    ).toEqual(['Off budget', 'Rent', 'Transfers', 'Uncategorized']);
  },
);

it('preserves transactions matching another branch of a mixed-field OR', async () => {
  vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
    assets: [],
    debts: [
      rent,
      { ...rent, category: 'food', categoryGroup: 'expenses', amount: -50 },
    ],
  });
  const { rows } = await build(
    {
      conditions: [
        { field: 'category_group', op: 'is', value: 'bills' },
        { field: 'notes', op: 'contains', value: 'test' },
      ],
      conditionsOp: 'or',
    },
    -150,
  );
  expect(rows.find(row => row.name === 'Food')?.totalDebts).toBe(-50);
});

it.each<RuleConditionEntity[]>([
  [{ field: 'category', op: 'oneOf', value: [] }],
  [{ field: 'category', op: 'notOneOf', value: [] }],
  [{ field: 'category', op: 'matches', value: '^rent$' }],
  [
    { field: 'category', op: 'is', value: 'rent' },
    { field: 'category', op: 'is', value: 'utilities' },
  ],
])(
  'does not create rows for conditions that match no categories: %j',
  async (...conditions) => {
    vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
      assets: [],
      debts: [],
    });
    const { rows, groups } = await build({ conditions }, 0);
    expect(rows).toEqual([]);
    expect(groups).toEqual([]);
  },
);

it('matches category names with the same wildcard semantics as queries', async () => {
  const { rows } = await build({
    conditions: [{ field: 'category', op: 'contains', value: 'R?N%' }],
  });
  expect(rows.map(row => row.name)).toEqual(['Rent']);
});

it('retains off-budget rows for selected categorized transactions', async () => {
  vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
    assets: [],
    debts: [rent, { ...rent, accountOffBudget: true, amount: -30 }],
  });
  const { rows } = await build(
    {
      conditions: [{ field: 'category', op: 'is', value: 'rent' }],
      showOffBudget: true,
    },
    -130,
  );
  expect(rows.map(row => row.name)).toEqual(['Off budget', 'Rent']);
});

it('keeps empty payee rows independent of category row selection', async () => {
  const { result, unmount } = renderHook(useSpreadsheet, {
    wrapper: SpreadsheetProvider,
  });
  const setData = vi.fn<(data: DataEntity) => void>();
  await createCustomSpreadsheet({
    ...defaults,
    groupBy: 'Payee',
    conditions: [{ field: 'category', op: 'is', value: 'rent' }],
    payees: [
      { id: '', name: 'Active payee' },
      { id: 'empty-payee', name: 'Empty payee' },
    ],
  })(result.current, setData);
  expect(setData.mock.calls[0][0].data?.map(row => row.name)).toEqual([
    'Active payee',
    'Empty payee',
  ]);
  expect(setData.mock.calls[0][0].totalDebts).toBe(-100);
  unmount();
});

it('keeps selected empty categories when there are no matching transactions', async () => {
  vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
    assets: [],
    debts: [],
  });
  const { groups, rows } = await build(
    {
      conditions: [{ field: 'category', op: 'is', value: 'utilities' }],
    },
    0,
  );
  expect(groups.map(row => row.name)).toEqual(['Bills']);
  expect(rows.map(row => row.name)).toEqual(['Utilities']);
});

it('respects the transfer exclusion in a saved category-is-null condition', async () => {
  // Persisted filters can contain null even though RuleConditionEntity models
  // category IDs as strings.
  const conditions: RuleConditionEntity[] = JSON.parse(
    '[{"field":"category","op":"is","value":null}]',
  );
  vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
    assets: [],
    debts: [],
  });
  const { rows } = await build(
    { conditions, showUncategorized: true, showOffBudget: true },
    0,
  );
  expect(rows.map(row => row.name)).toEqual(['Off budget', 'Uncategorized']);
});

it.each(['oneOf', 'notOneOf'] as const)(
  'does not restore synthetic rows for an empty %s selection',
  async op => {
    vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
      assets: [],
      debts: [],
    });
    const { rows } = await build(
      {
        conditions: [{ field: 'category', op, value: [] }],
        showUncategorized: true,
        showOffBudget: true,
      },
      0,
    );
    expect(rows).toEqual([]);
  },
);

it.each([
  { op: 'oneOf', names: ['Off budget', 'Transfers', 'Uncategorized'] },
  { op: 'notOneOf', names: ['Food', 'Off budget', 'Rent', 'Utilities'] },
])(
  'handles saved $op conditions containing a null category',
  async ({ op, names }) => {
    const conditions: RuleConditionEntity[] = JSON.parse(
      `[{"field":"category","op":"${op}","value":[null]}]`,
    );
    vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
      assets: [],
      debts: [],
    });
    const { rows } = await build(
      { conditions, showUncategorized: true, showOffBudget: true },
      0,
    );
    expect(rows.map(row => row.name)).toEqual(names);
  },
);
