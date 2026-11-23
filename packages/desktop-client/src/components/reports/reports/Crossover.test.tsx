import { useEffect } from 'react';

import type {
  AccountEntity,
  CategoryEntity,
  CrossoverWidget,
} from '@actual-app/core/types/models';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Crossover } from './Crossover';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

const mocks = vi.hoisted(() => ({
  createCrossoverSpreadsheet: vi.fn(() => async () => undefined),
  send: vi.fn(),
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

// `setupTests.ts` imports `#redux/store` -> `#modals/modalsSlice` -> `#accounts`,
// binding the connection module inside `#accounts` before file-level `vi.mock`
// runs. Keep real `useQuery` + `accountQueries.list()` options (including
// `placeholderData: []`) while routing `queryFn` through `mocks.send`.
vi.mock('#hooks/useAccounts', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  const { accountQueries } = await import('#accounts');
  return {
    useAccounts: () =>
      useQuery({
        ...accountQueries.list(),
        queryFn: () => mocks.send('accounts-get'),
      }),
  };
});

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

function renderCrossover() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Crossover />
    </QueryClientProvider>,
  );
}

describe('Crossover', () => {
  let categoriesDeferred: ReturnType<
    typeof createDeferred<{ grouped: never[]; list: CategoryEntity[] }>
  >;
  let accountsDeferred: ReturnType<typeof createDeferred<AccountEntity[]>>;

  beforeEach(() => {
    savedWidget.meta = {
      expenseCategoryIds: [expenseCategory.id],
      incomeAccountIds: [incomeAccount.id],
    };
    categoriesDeferred = createDeferred();
    accountsDeferred = createDeferred();
    mocks.createCrossoverSpreadsheet.mockClear();
    mocks.send.mockReset();
    mocks.send.mockImplementation(async (name: string) => {
      if (name === 'get-earliest-transaction') {
        return { date: '2024-01-01' };
      }
      if (name === 'get-categories') {
        return categoriesDeferred.promise;
      }
      if (name === 'accounts-get') {
        return accountsDeferred.promise;
      }
      return undefined;
    });
  });

  it('waits for placeholder category and account queries before calculating after a refresh', async () => {
    renderCrossover();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mocks.createCrossoverSpreadsheet).not.toHaveBeenCalled();

    await act(async () => {
      accountsDeferred.resolve([incomeAccount]);
      await accountsDeferred.promise;
    });
    expect(mocks.createCrossoverSpreadsheet).not.toHaveBeenCalled();

    await act(async () => {
      categoriesDeferred.resolve({ grouped: [], list: [expenseCategory] });
      await categoriesDeferred.promise;
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

  it('waits for placeholder account data when widget meta omits incomeAccountIds', async () => {
    savedWidget.meta = {
      expenseCategoryIds: [expenseCategory.id],
    };
    renderCrossover();

    await act(async () => {
      categoriesDeferred.resolve({ grouped: [], list: [expenseCategory] });
      await categoriesDeferred.promise;
    });
    expect(mocks.createCrossoverSpreadsheet).not.toHaveBeenCalled();

    await act(async () => {
      accountsDeferred.resolve([incomeAccount]);
      await accountsDeferred.promise;
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
      expect.objectContaining({ incomeAccountIds: [] }),
    );
  });

  it('calculates with intentionally empty selections after initialization', async () => {
    savedWidget.meta = {
      expenseCategoryIds: [],
      incomeAccountIds: [],
    };
    renderCrossover();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mocks.createCrossoverSpreadsheet).not.toHaveBeenCalled();

    await act(async () => {
      accountsDeferred.resolve([incomeAccount]);
      categoriesDeferred.resolve({ grouped: [], list: [expenseCategory] });
      await Promise.all([accountsDeferred.promise, categoriesDeferred.promise]);
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
