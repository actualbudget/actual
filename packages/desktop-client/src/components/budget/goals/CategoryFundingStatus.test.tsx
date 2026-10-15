import { View } from '@actual-app/components/view';
import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryFunding } from '@actual-app/core/server/budget/goal-template';
import type { CategoryEntity, NoteEntity } from '@actual-app/core/types/models';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { fundingQueries } from '#budget/queries';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CategoryFundingStatus } from './CategoryFundingStatus';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));

const category: CategoryEntity = {
  id: 'groceries',
  name: 'Groceries',
  group: 'usual',
  is_income: false,
  goal_def:
    '[{"type":"simple","monthly":650,"directive":"template","priority":0}]',
  template_settings: { source: 'ui' },
};
const underfunded = { budgeted: 40000, recommended: 65000, remaining: 25000 };
const funded = { budgeted: 65000, recommended: 65000, remaining: 0 };
const assignName =
  'Assign money to underfunded goal: Groceries for January 2024';

let funding: CategoryFunding | null;
let notes: NoteEntity[];
let client: ReturnType<typeof createTestQueryClient>;
let store: ReturnType<typeof configureTestAppStore>;
const read = vi.fn<() => Promise<CategoryFunding | null>>();
const fund = vi.fn<() => Promise<boolean>>();

function renderFunding({
  cat = category,
  onFunded = vi.fn(),
  onKeyDown = vi.fn(),
} = {}) {
  render(
    <TestProviders queryClient={client} store={store}>
      <View onKeyDown={onKeyDown}>
        <CategoryFundingStatus
          category={cat}
          month="2024-01"
          onFunded={onFunded}
        />
      </View>
    </TestProviders>,
  );
}

function deferNextRead() {
  let finish: (value: CategoryFunding | null) => void;
  read.mockImplementationOnce(() => new Promise(resolve => (finish = resolve)));
  act(() => {
    void client.invalidateQueries({ queryKey: fundingQueries.all() });
  });
  return (value: CategoryFunding | null) => act(async () => finish(value));
}

beforeEach(() => {
  funding = { budgeted: 0, recommended: 65000, remaining: 65000 };
  notes = [];
  client = createTestQueryClient();
  store = configureTestAppStore({ queryClient: client });
  store.dispatch(mergeSyncedPrefs({ 'flags.goalTemplatesEnabled': 'true' }));
  read.mockReset().mockImplementation(async () => funding);
  fund.mockReset().mockImplementation(async () => {
    funding = funded;
    return true;
  });
  initServer({
    'budget/category-funding': read,
    'budget/fund-category': fund,
    query: async () => ({ data: notes, dependencies: [] }),
  });
});

describe('CategoryFundingStatus', () => {
  it.each([
    [
      'underfunded',
      { budgeted: 0, recommended: 65000, remaining: 65000 },
      '650.00 needed',
    ],
    ['underfunded', underfunded, '250.00 needed'],
    ['funded', funded, 'Funded'],
    ['funded', { ...funded, budgeted: 90000 }, 'Funded'],
    [
      'not-needed',
      { budgeted: 0, recommended: 0, remaining: 0 },
      'No funding needed',
    ],
  ])('shows the %s state from the engine result', async (_, value, text) => {
    funding = value;
    renderFunding();
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: assignName })).toHaveLength(
      value.remaining > 0 ? 1 : 0,
    );
    expect(read).toHaveBeenCalledOnce();
  });

  it('shows an unavailable state instead of a funded check when the engine fails', async () => {
    read.mockRejectedValue(new Error('Invalid automation'));
    renderFunding();
    expect(
      await screen.findByText('Automation unavailable'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Funded')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['the feature is off', 'false', category],
    [
      'the category has no automation',
      'true',
      { ...category, goal_def: undefined },
    ],
  ])('does not query or show funding when %s', async (_, flag, cat) => {
    store.dispatch(mergeSyncedPrefs({ 'flags.goalTemplatesEnabled': flag }));
    renderFunding({ cat });
    await act(() => Promise.resolve());
    expect(read).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('category-funding-status'),
    ).not.toBeInTheDocument();
  });

  it('shows funding for a category with note templates', async () => {
    notes = [{ id: 'groceries', note: '#template 650' }];
    renderFunding({ cat: { ...category, goal_def: undefined } });
    expect(await screen.findByText('650.00 needed')).toBeInTheDocument();
    expect(read).toHaveBeenCalledOnce();
  });

  it('funds from the keyboard, refreshes, and offers Undo', async () => {
    const user = userEvent.setup();
    const onFunded = vi.fn();
    const onKeyDown = vi.fn();
    renderFunding({ onFunded, onKeyDown });
    const button = await screen.findByRole('button', { name: assignName });
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Funded')).toBeInTheDocument();
    expect(fund).toHaveBeenCalledExactlyOnceWith({
      month: '2024-01',
      categoryId: 'groceries',
    });
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(onFunded).toHaveBeenCalledOnce();
    expect(store.getState().notifications.notifications).toMatchObject([
      { button: { title: 'Undo' } },
    ]);
  });

  it('does not offer Undo or close the menu when funding makes no change', async () => {
    fund.mockResolvedValue(false);
    const onFunded = vi.fn();
    renderFunding({ onFunded });
    await userEvent.click(
      await screen.findByRole('button', { name: assignName }),
    );
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(store.getState().notifications.notifications).toHaveLength(0);
    expect(screen.getByText('650.00 needed')).toBeInTheDocument();
    expect(onFunded).not.toHaveBeenCalled();
  });

  it('keeps the row underfunded and shows the normal error when funding fails', async () => {
    fund.mockRejectedValue(new Error('Could not save'));
    renderFunding();
    await userEvent.click(
      await screen.findByRole('button', { name: assignName }),
    );
    await waitFor(() =>
      expect(store.getState().notifications.notifications).toHaveLength(1),
    );
    expect(screen.getByText('650.00 needed')).toBeInTheDocument();
  });

  it('keeps focus while refreshing, shows Updating…, and removes the status with the automation', async () => {
    renderFunding();
    const button = await screen.findByRole('button', { name: assignName });
    act(() => button.focus());
    let finish = deferNextRead();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(button).toHaveFocus();
    expect(button).toBeEnabled();
    await finish(funded);
    expect(await screen.findByText('Funded')).toBeInTheDocument();
    finish = deferNextRead();
    expect(await screen.findByText('Updating…')).toBeInTheDocument();
    expect(screen.getByTestId('category-funding-status')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await finish(null);
    await waitFor(() =>
      expect(
        screen.queryByTestId('category-funding-status'),
      ).not.toBeInTheDocument(),
    );
  });
});
