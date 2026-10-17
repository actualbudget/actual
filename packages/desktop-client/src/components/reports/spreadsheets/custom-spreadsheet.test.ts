import type { DataEntity } from '@actual-app/core/types/models';
import { renderHook } from '@testing-library/react';

import type { QueryDataEntity } from '#components/reports/ReportOptions';
import { SpreadsheetProvider, useSpreadsheet } from '#hooks/useSpreadsheet';

import { createCustomSpreadsheet } from './custom-spreadsheet';
import { fetchSpreadsheetQueryData } from './fetchSpreadsheetQueryData';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn().mockResolvedValue({ filters: [] }),
  listen: vi.fn(() => vi.fn()),
}));
vi.mock('./fetchSpreadsheetQueryData');

const transaction: QueryDataEntity = {
  date: '2026-01',
  category: 'category',
  categoryHidden: false,
  categoryGroup: 'group',
  categoryGroupHidden: false,
  account: 'account',
  accountOffBudget: false,
  payee: 'payee',
  transferAccount: '',
  notes: '#red #circle',
  amount: -100,
};

it.each([
  { categoryHidden: true },
  { categoryGroupHidden: true },
  { accountOffBudget: true },
  { category: null },
])(
  'does not create empty combinations from excluded transactions %j',
  async excluded => {
    vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
      assets: [],
      debts: [
        { ...transaction, ...excluded },
        { ...transaction, notes: '#red', amount: -50 },
        { ...transaction, notes: '#red', amount: -25, date: '2026-02' },
      ],
    });
    const { result } = renderHook(useSpreadsheet, {
      wrapper: SpreadsheetProvider,
    });
    const setData = vi.fn<(data: DataEntity) => void>();
    await createCustomSpreadsheet({
      startDate: '2026-01',
      endDate: '2026-02',
      interval: 'Monthly',
      categories: { list: [], grouped: [] },
      conditions: [],
      conditionsOp: 'and',
      showEmpty: true,
      showOffBudget: false,
      showHiddenCategories: false,
      showUncategorized: false,
      trimIntervals: false,
      groupBy: 'Tag',
      tags: [
        { id: 'red', tag: 'red' },
        { id: 'circle', tag: 'circle' },
      ],
    })(result.current, setData);

    const data = setData.mock.calls[0][0];
    expect(data.data?.map(group => group.name)).toEqual(
      expect.arrayContaining(['#red', '#circle', 'Untagged']),
    );
    expect(data.data).toHaveLength(3);
    expect(data.totalDebts).toBe(-75);
    expect(data.intervalData.map(interval => interval.totalDebts)).toEqual([
      -50, -25,
    ]);
  },
);

it('includes the complete final week in a weekly report query', async () => {
  vi.mocked(fetchSpreadsheetQueryData).mockResolvedValue({
    assets: [],
    debts: [],
  });
  const { result } = renderHook(useSpreadsheet, {
    wrapper: SpreadsheetProvider,
  });

  await createCustomSpreadsheet({
    startDate: '2024-09-30',
    endDate: '2024-10-28',
    interval: 'Weekly',
    categories: { list: [], grouped: [] },
    conditions: [],
    conditionsOp: 'and',
    showEmpty: true,
    showOffBudget: false,
    showHiddenCategories: false,
    showUncategorized: false,
    trimIntervals: false,
    groupBy: 'Tag',
    tags: [{ id: 'red', tag: 'red' }],
    firstDayOfWeekIdx: '1',
  })(result.current, vi.fn());

  expect(fetchSpreadsheetQueryData).toHaveBeenCalledWith(
    expect.objectContaining({
      endDate: '2024-11-03',
    }),
  );
});
