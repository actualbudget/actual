import { useState } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TourProvider, useTour } from '#components/tour/TourProvider';
import { useAccounts } from '#hooks/useAccounts';
import { useLocalPref } from '#hooks/useLocalPref';
import { useQuery } from '#hooks/useQuery';
import { useSheetValue } from '#hooks/useSheetValue';
import { TestProviders } from '#mocks';

import { OnboardingChecklist } from './OnboardingChecklist';
import { OnboardingProvider, useOnboarding } from './OnboardingProvider';

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: vi.fn(),
}));

vi.mock('#hooks/useQuery', () => ({
  useQuery: vi.fn(),
}));

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: vi.fn(),
}));

// Local prefs are stored per budget in localStorage; keep them in memory so
// tests start from a clean slate without a budget id.
const prefs = new Map<string, unknown>();
vi.mock('#hooks/useLocalPref', () => ({
  useLocalPref: vi.fn(),
}));

type Data = {
  accounts?: Array<{ id: string; closed?: boolean; offbudget?: boolean }>;
  transactions?: Array<{ id: string }>;
  schedules?: Array<{ id: string }>;
  totalBudgeted?: number | null;
};

function mockData({
  accounts = [],
  transactions = [],
  schedules = [],
  totalBudgeted = 0,
}: Data) {
  vi.mocked(useAccounts).mockReturnValue({
    data: accounts,
    isPending: false,
  } as unknown as ReturnType<typeof useAccounts>);
  vi.mocked(useQuery).mockImplementation(makeQuery => {
    const query = makeQuery();
    const table = (query as unknown as { state: { table: string } })?.state
      ?.table;
    return {
      data: table === 'schedules' ? schedules : transactions,
      isLoading: false,
    } as ReturnType<typeof useQuery>;
  });
  vi.mocked(useSheetValue).mockReturnValue(totalBudgeted);
}

function Wrapper({
  children,
  path = '/budget',
}: {
  children: ReactNode;
  path?: string;
}) {
  return (
    <TestProviders>
      <MemoryRouter initialEntries={[path]}>
        <TourProvider>
          <OnboardingProvider>{children}</OnboardingProvider>
        </TourProvider>
      </MemoryRouter>
    </TestProviders>
  );
}

function TourSpy() {
  const { activeTourId } = useTour();
  return <output data-testid="active-tour">{activeTourId ?? 'none'}</output>;
}

describe('OnboardingProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prefs.clear();
    vi.mocked(useLocalPref).mockImplementation(((name: string) => {
      const [, force] = useState(0);
      return [
        prefs.get(name),
        (value: unknown) => {
          prefs.set(name, value);
          force(n => n + 1);
        },
        () => prefs.delete(name),
      ];
    }) as unknown as typeof useLocalPref);
  });

  it('derives completion from the budget data rather than from watched tours', () => {
    mockData({
      accounts: [{ id: 'a1' }],
      transactions: [{ id: 't1' }],
      totalBudgeted: 0,
    });

    const { result } = renderHook(() => useOnboarding(), { wrapper: Wrapper });

    const byId = Object.fromEntries(
      result.current.steps.map(step => [step.id, step.isDone]),
    );
    expect(byId).toEqual({
      'add-account': true,
      'add-transactions': true,
      'plan-budget': false,
      'add-schedule': false,
      'explore-reports': false,
    });
    expect(result.current.completedCount).toBe(2);
    expect(result.current.isAllDone).toBe(false);
  });

  it('ignores closed accounts and counts a budgeted month', () => {
    mockData({
      accounts: [{ id: 'a1', closed: true }],
      schedules: [{ id: 's1' }],
      totalBudgeted: 12345,
    });

    const { result } = renderHook(() => useOnboarding(), { wrapper: Wrapper });

    const byId = Object.fromEntries(
      result.current.steps.map(step => [step.id, step.isDone]),
    );
    expect(byId['add-account']).toBe(false);
    expect(byId['plan-budget']).toBe(true);
    expect(byId['add-schedule']).toBe(true);
  });

  it('marks the reports step done once the reports page has been visited', () => {
    mockData({});

    const { result } = renderHook(() => useOnboarding(), {
      wrapper: ({ children }) => (
        <Wrapper path="/reports/main">{children}</Wrapper>
      ),
    });

    expect(
      result.current.steps.find(step => step.id === 'explore-reports')?.isDone,
    ).toBe(true);
    expect(prefs.get('onboarding.reportsVisited')).toBe(true);
  });

  it('remembers completed tour chapters', () => {
    mockData({});
    const { result } = renderHook(() => useOnboarding(), { wrapper: Wrapper });

    act(() => result.current.markTourCompleted('budget-tour'));
    act(() => result.current.markTourCompleted('budget-tour'));

    expect(result.current.completedTours).toEqual(['budget-tour']);
  });
});

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prefs.clear();
    vi.mocked(useLocalPref).mockImplementation(((name: string) => {
      const [, force] = useState(0);
      return [
        prefs.get(name),
        (value: unknown) => {
          prefs.set(name, value);
          force(n => n + 1);
        },
        () => prefs.delete(name),
      ];
    }) as unknown as typeof useLocalPref);
  });

  it('collapses to a launcher showing the progress', async () => {
    mockData({ accounts: [{ id: 'a1' }] });
    const user = userEvent.setup();

    render(
      <Wrapper>
        <OnboardingChecklist />
      </Wrapper>,
    );

    const launcher = screen.getByTestId('onboarding-launcher');
    expect(launcher).toHaveTextContent('1/5');
    expect(launcher).toHaveTextContent('Getting started');

    await user.click(launcher);

    expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument();
    expect(screen.getByRole('list').children).toHaveLength(5);
    expect(screen.getByTestId('onboarding-step-add-account')).toHaveAttribute(
      'data-done',
      'true',
    );
    expect(
      screen.getByTestId('onboarding-step-add-transactions'),
    ).toHaveAttribute('data-done', 'false');
  });

  it('starts the matching tour chapter from a step', async () => {
    mockData({});
    prefs.set('onboarding.checklistExpanded', true);
    const user = userEvent.setup();

    render(
      <Wrapper>
        <OnboardingChecklist />
        <TourSpy />
      </Wrapper>,
    );

    await user.click(
      screen.getByRole('button', {
        name: /Show me: Schedule a recurring bill/,
      }),
    );

    expect(screen.getByTestId('active-tour')).toHaveTextContent(
      'schedules-tour',
    );
    // The checklist gets out of the way while the guide runs.
    expect(
      screen.queryByTestId('onboarding-checklist'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-launcher')).not.toBeInTheDocument();
  });

  it('can be hidden and remembers it', async () => {
    mockData({});
    prefs.set('onboarding.checklistExpanded', true);
    const user = userEvent.setup();

    render(
      <Wrapper>
        <OnboardingChecklist />
      </Wrapper>,
    );

    await user.click(screen.getByTestId('onboarding-hide'));

    expect(
      screen.queryByTestId('onboarding-checklist'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-launcher')).not.toBeInTheDocument();
    expect(prefs.get('onboarding.checklistHidden')).toBe(true);
  });

  it('can be dismissed from the collapsed launcher and remembers it', async () => {
    mockData({});
    const user = userEvent.setup();

    render(
      <Wrapper>
        <OnboardingChecklist />
      </Wrapper>,
    );

    expect(screen.getByTestId('onboarding-launcher')).toBeInTheDocument();

    await user.click(screen.getByTestId('onboarding-launcher-dismiss'));

    expect(screen.queryByTestId('onboarding-launcher')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('onboarding-checklist'),
    ).not.toBeInTheDocument();
    expect(prefs.get('onboarding.checklistHidden')).toBe(true);
  });

  it('celebrates when everything is done', () => {
    mockData({
      accounts: [{ id: 'a1' }],
      transactions: [{ id: 't1' }],
      schedules: [{ id: 's1' }],
      totalBudgeted: 100,
    });
    prefs.set('onboarding.reportsVisited', true);
    prefs.set('onboarding.checklistExpanded', true);

    render(
      <Wrapper>
        <OnboardingChecklist />
      </Wrapper>,
    );

    expect(screen.getByText("You're all set!")).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Replay guide/ }),
    ).toHaveLength(5);
  });
});
