import { useEffect } from 'react';

import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  CrossoverWidget,
} from '@actual-app/core/types/models';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Crossover } from './Crossover';

type CategoryResult = {
  data: {
    grouped: CategoryGroupEntity[];
    list: CategoryEntity[];
  };
  isPending: boolean;
};

const mocks = vi.hoisted(() => ({
  categoryResult: {
    data: { grouped: [], list: [] },
    isPending: true,
  } as CategoryResult,
  categoryListeners: new Set<() => void>(),
  createCrossoverSpreadsheet: vi.fn(() => async () => undefined),
  send: vi.fn(async () => ({ date: '2024-01-01' })),
}));

const expenseCategory = {
  id: 'expense-1',
  name: 'Food',
  is_income: false,
  hidden: false,
} as CategoryEntity;

const incomeAccount = {
  id: 'account-1',
  name: 'Investment',
} as AccountEntity;

const savedWidget = {
  id: 'widget-1',
  type: 'crossover-card',
  meta: {
    expenseCategoryIds: [expenseCategory.id],
    incomeAccountIds: [incomeAccount.id],
  },
} as CrossoverWidget;

vi.mock('react-router', async importOriginal => ({
  ...(await importOriginal()),
  useParams: () => ({ id: savedWidget.id }),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: mocks.send,
}));

vi.mock('#components/reports/spreadsheets/crossover-spreadsheet', () => ({
  createCrossoverSpreadsheet: mocks.createCrossoverSpreadsheet,
}));

vi.mock('#components/reports/useReport', () => ({
  useReport: (
    _sheetName: string,
    getData: (spreadsheet: never, setData: () => void) => Promise<void>,
  ) => {
    useEffect(() => {
      void getData({} as never, vi.fn());
    }, [getData]);
    return null;
  },
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [incomeAccount] }),
}));

vi.mock('#hooks/useCategories', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useCategories: () =>
      useSyncExternalStore(
        listener => {
          mocks.categoryListeners.add(listener);
          return () => mocks.categoryListeners.delete(listener);
        },
        () => mocks.categoryResult,
      ),
  };
});

vi.mock('#hooks/useDashboardWidget', () => ({
  useDashboardWidget: () => ({ data: savedWidget, isPending: false }),
}));

vi.mock('#hooks/useFormat', () => ({
  useFormat: () => vi.fn(),
}));

vi.mock('#hooks/useLocale', async () => {
  const { enUS } = await import('date-fns/locale');
  return { useLocale: () => enUS };
});

vi.mock('#hooks/useNavigate', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('#notifications/notificationsSlice', () => ({
  addNotification: vi.fn(),
}));

vi.mock('#redux', () => ({
  useDispatch: () => vi.fn(),
}));

vi.mock('#reports/mutations', () => ({
  useUpdateDashboardWidgetMutation: () => ({ mutate: vi.fn() }),
}));

describe('Crossover', () => {
  beforeEach(() => {
    savedWidget.meta = {
      expenseCategoryIds: [expenseCategory.id],
      incomeAccountIds: [incomeAccount.id],
    };
    mocks.categoryResult = {
      data: { grouped: [], list: [] },
      isPending: true,
    };
    mocks.categoryListeners.clear();
    mocks.createCrossoverSpreadsheet.mockClear();
    mocks.send.mockClear();
  });

  it('waits for saved selections before calculating after a refresh', async () => {
    render(<Crossover />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      mocks.categoryResult = {
        data: {
          grouped: [],
          list: [expenseCategory],
        },
        isPending: false,
      };
      mocks.categoryListeners.forEach(listener => listener());
    });

    await waitFor(() => {
      expect(mocks.createCrossoverSpreadsheet).toHaveBeenCalledWith(
        expect.objectContaining({
          expenseCategoryIds: [expenseCategory.id],
          incomeAccountIds: [incomeAccount.id],
        }),
      );
    });

    expect(mocks.createCrossoverSpreadsheet).not.toHaveBeenCalledWith(
      expect.objectContaining({ expenseCategoryIds: [] }),
    );
  });

  it('calculates with intentionally empty selections after initialization', async () => {
    savedWidget.meta = {
      expenseCategoryIds: [],
      incomeAccountIds: [],
    };
    render(<Crossover />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mocks.createCrossoverSpreadsheet).not.toHaveBeenCalled();

    await act(async () => {
      mocks.categoryResult = {
        data: {
          grouped: [],
          list: [expenseCategory],
        },
        isPending: false,
      };
      mocks.categoryListeners.forEach(listener => listener());
    });

    await waitFor(() => {
      expect(mocks.createCrossoverSpreadsheet).toHaveBeenCalledWith(
        expect.objectContaining({
          expenseCategoryIds: [],
          incomeAccountIds: [],
        }),
      );
    });
  });
});
