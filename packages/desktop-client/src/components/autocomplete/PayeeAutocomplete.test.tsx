import { generateAccount } from '@actual-app/core/mocks';
import type {
  AccountEntity,
  NearbyPayeeEntity,
  PayeeEntity,
} from '@actual-app/core/types/models';
import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { Screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { AuthProvider } from '#auth/AuthProvider';
import { useNearbyPayees } from '#hooks/useNearbyPayees';
import { createTestQueryClient, TestProviders } from '#mocks';
import { payeeQueries } from '#payees';

import { PayeeAutocomplete } from './PayeeAutocomplete';
import type { PayeeAutocompleteProps } from './PayeeAutocomplete';

const PAYEE_SELECTOR = '[data-testid][role=option]';
const PAYEE_SECTION_SELECTOR = '[data-testid$="-item-group"]';
const ALL_PAYEE_ITEMS_SELECTOR = '[data-testid$="-payee-item"]';

const payees = [
  makePayee('Bob', { favorite: true }),
  makePayee('Alice', { favorite: true }),
  makePayee('This guy on the side of the road'),
];

const accounts: AccountEntity[] = [
  generateAccount('Bank of Montreal', false, false),
];
const defaultProps = {
  value: null,
  embedded: true,
  payees,
  accounts,
};

function makePayee(name: string, options?: { favorite: boolean }): PayeeEntity {
  return {
    id: name.toLowerCase() + '-id',
    name,
    favorite: options?.favorite ? true : false,
    transfer_acct: undefined,
  };
}

function makeNearbyPayee(name: string, distance: number): NearbyPayeeEntity {
  const id = name.toLowerCase() + '-id';
  return {
    payee: {
      id,
      name,
      favorite: false,
      transfer_acct: undefined,
    },
    location: {
      id: id + '-loc',
      payee_id: id,
      latitude: 0,
      longitude: 0,
      created_at: 0,
      distance,
    },
  };
}

function extractPayeesAndHeaderNames(
  screen: Screen,
  itemSelector: string = PAYEE_SELECTOR,
) {
  const autocompleteElement = screen.getByTestId('autocomplete');

  // Get all elements that match either selector, but query them separately
  // and then sort by their position in the DOM to maintain document order
  const headers = [
    ...autocompleteElement.querySelectorAll(PAYEE_SECTION_SELECTOR),
  ];
  const items = [...autocompleteElement.querySelectorAll(itemSelector)];

  // Combine all elements and sort by their position in the DOM
  const allElements = [...headers, ...items];
  allElements.sort((a, b) => {
    // Compare document position to maintain DOM order
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  });

  return allElements
    .map(e => e.getAttribute('data-testid'))
    .map(firstOrIncorrect);
}

// Not good, see `Autocomplete.js` for details
function waitForAutocomplete() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function clickAutocomplete(autocomplete: HTMLElement) {
  const input = autocomplete.querySelector(`input`);
  if (input != null) {
    await userEvent.click(input);
  }
  await waitForAutocomplete();
}

vi.mock('#hooks/useLocationPermission', () => ({
  useLocationPermission: vi.fn(() => ({
    isGranted: true,
    isPending: false,
    requestPermission: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('#hooks/useNearbyPayees', () => ({
  useNearbyPayees: vi.fn(),
}));

function firstOrIncorrect(id: string | null): string {
  return id?.split('-', 1)[0] || 'incorrect';
}

function mockNearbyPayeesResult(
  data: NearbyPayeeEntity[],
): UseQueryResult<NearbyPayeeEntity[], Error> {
  return {
    data,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: 'idle',
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    isEnabled: true,
    refetch: vi.fn(),
    status: 'success',
  };
}

describe('PayeeAutocomplete.getPayeeSuggestions', () => {
  const queryClient = createTestQueryClient();

  beforeEach(() => {
    vi.mocked(useNearbyPayees).mockReturnValue(mockNearbyPayeesResult([]));
    queryClient.setQueryData(payeeQueries.listCommon().queryKey, []);
  });

  function renderPayeeAutocomplete(
    props?: Partial<PayeeAutocompleteProps>,
  ): HTMLElement {
    const autocompleteProps = {
      ...defaultProps,
      ...props,
    };

    render(
      <TestProviders queryClient={queryClient}>
        <AuthProvider>
          <div data-testid="autocomplete-test">
            <PayeeAutocomplete
              {...autocompleteProps}
              onSelect={vi.fn()}
              type="single"
              value={null}
              embedded={false}
            />
          </div>
        </AuthProvider>
      </TestProviders>,
    );
    return screen.getByTestId('autocomplete-test');
  }

  test('favorites get sorted alphabetically', async () => {
    const autocomplete = renderPayeeAutocomplete();
    await clickAutocomplete(autocomplete);

    expect(
      [
        ...screen.getByTestId('autocomplete').querySelectorAll(PAYEE_SELECTOR),
      ].map(e => e.getAttribute('data-testid')),
    ).toStrictEqual([
      'Alice-payee-item',
      'Bob-payee-item',
      'This guy on the side of the road-payee-item',
    ]);
  });

  test('list with less than the maximum favorites adds common payees', async () => {
    //Note that the payees list assumes the payees are already sorted
    const payees: PayeeEntity[] = [
      makePayee('Alice'),
      makePayee('Bob'),
      makePayee('Eve', { favorite: true }),
      makePayee('Bruce'),
      makePayee('Carol'),
      makePayee('Natasha'),
      makePayee('Steve'),
      makePayee('Tony'),
    ];
    queryClient.setQueryData(payeeQueries.listCommon().queryKey, [
      makePayee('Bruce'),
      makePayee('Natasha'),
      makePayee('Steve'),
      makePayee('Tony'),
      makePayee('Carol'),
    ]);
    const expectedPayeeOrder = [
      'Suggested Payees',
      'Eve',
      'Bruce',
      'Natasha',
      'Steve',
      'Tony',
      'Payees',
      'Alice',
      'Bob',
      'Carol',
    ];
    await clickAutocomplete(renderPayeeAutocomplete({ payees }));

    expect(extractPayeesAndHeaderNames(screen)).toStrictEqual(
      expectedPayeeOrder,
    );
  });

  test('list with more than the maximum favorites only lists favorites', async () => {
    //Note that the payees list assumes the payees are already sorted
    const payees = [
      makePayee('Alice', { favorite: true }),
      makePayee('Bob', { favorite: true }),
      makePayee('Eve', { favorite: true }),
      makePayee('Bruce', { favorite: true }),
      makePayee('Carol', { favorite: true }),
      makePayee('Natasha'),
      makePayee('Steve'),
      makePayee('Tony', { favorite: true }),
    ];
    queryClient.setQueryData(payeeQueries.listCommon().queryKey, [
      makePayee('Bruce'),
      makePayee('Natasha'),
      makePayee('Steve'),
      makePayee('Tony'),
      makePayee('Carol'),
    ]);
    const expectedPayeeOrder = [
      'Suggested Payees',
      'Alice',
      'Bob',
      'Bruce',
      'Carol',
      'Eve',
      'Tony',
      'Payees',
      'Natasha',
      'Steve',
    ];
    const autocomplete = renderPayeeAutocomplete({ payees });
    await clickAutocomplete(autocomplete);

    expect(extractPayeesAndHeaderNames(screen)).toStrictEqual(
      expectedPayeeOrder,
    );
  });

  test('nearby payees appear in their own section before other payees', async () => {
    const nearbyPayees = [
      makeNearbyPayee('Coffee Shop', 0.3),
      makeNearbyPayee('Grocery Store', 1.2),
    ];
    const payees = [makePayee('Alice'), makePayee('Bob')];
    vi.mocked(useNearbyPayees).mockReturnValue(
      mockNearbyPayeesResult(nearbyPayees),
    );

    await clickAutocomplete(renderPayeeAutocomplete({ payees }));

    expect(
      extractPayeesAndHeaderNames(screen, ALL_PAYEE_ITEMS_SELECTOR),
    ).toStrictEqual([
      'Nearby Payees',
      'Coffee Shop',
      'Grocery Store',
      'Payees',
      'Alice',
      'Bob',
    ]);
  });

  test('nearby payees are filtered by search input', async () => {
    const nearbyPayees = [
      makeNearbyPayee('Coffee Shop', 0.3),
      makeNearbyPayee('Grocery Store', 1.2),
    ];
    const payees = [makePayee('Alice'), makePayee('Bob')];
    vi.mocked(useNearbyPayees).mockReturnValue(
      mockNearbyPayeesResult(nearbyPayees),
    );

    const autocomplete = renderPayeeAutocomplete({ payees });
    await clickAutocomplete(autocomplete);

    const input = autocomplete.querySelector('input')!;
    await userEvent.type(input, 'Coffee');
    await waitForAutocomplete();

    const names = extractPayeesAndHeaderNames(screen, ALL_PAYEE_ITEMS_SELECTOR);
    expect(names).toContain('Nearby Payees');
    expect(names).toContain('Coffee Shop');
    expect(names).not.toContain('Grocery Store');
    expect(names).not.toContain('Alice');
    expect(names).not.toContain('Bob');
  });

  test('nearby payees coexist with favorites and common payees', async () => {
    const nearbyPayees = [makeNearbyPayee('Coffee Shop', 0.3)];
    const payees = [
      makePayee('Alice'),
      makePayee('Bob'),
      makePayee('Eve', { favorite: true }),
      makePayee('Carol'),
    ];
    vi.mocked(useNearbyPayees).mockReturnValue(
      mockNearbyPayeesResult(nearbyPayees),
    );
    queryClient.setQueryData(payeeQueries.listCommon().queryKey, [
      makePayee('Bob'),
      makePayee('Carol'),
    ]);

    await clickAutocomplete(renderPayeeAutocomplete({ payees }));

    expect(
      extractPayeesAndHeaderNames(screen, ALL_PAYEE_ITEMS_SELECTOR),
    ).toStrictEqual([
      'Nearby Payees',
      'Coffee Shop',
      'Suggested Payees',
      'Eve',
      'Bob',
      'Carol',
      'Payees',
      'Alice',
    ]);
  });

  test('a payee appearing in both nearby and favorites shows in both sections', async () => {
    const nearbyPayees = [makeNearbyPayee('Eve', 0.5)];
    const payees = [makePayee('Alice'), makePayee('Eve', { favorite: true })];
    vi.mocked(useNearbyPayees).mockReturnValue(
      mockNearbyPayeesResult(nearbyPayees),
    );

    await clickAutocomplete(renderPayeeAutocomplete({ payees }));

    expect(
      extractPayeesAndHeaderNames(screen, ALL_PAYEE_ITEMS_SELECTOR),
    ).toStrictEqual([
      'Nearby Payees',
      'Eve',
      'Suggested Payees',
      'Eve',
      'Payees',
      'Alice',
    ]);
  });

  test('list with no favorites shows just the payees list', async () => {
    //Note that the payees list assumes the payees are already sorted
    const payees = [
      makePayee('Alice'),
      makePayee('Bob'),
      makePayee('Eve'),
      makePayee('Natasha'),
      makePayee('Steve'),
    ];
    const expectedPayeeOrder = ['Alice', 'Bob', 'Eve', 'Natasha', 'Steve'];
    const autocomplete = renderPayeeAutocomplete({ payees });
    await clickAutocomplete(autocomplete);

    expect(
      [
        ...screen
          .getByTestId('autocomplete')
          .querySelectorAll('[data-testid][role=option]'),
      ]
        .map(e => e.getAttribute('data-testid'))
        .flatMap(firstOrIncorrect),
    ).toStrictEqual(expectedPayeeOrder);
    expect(
      [
        ...screen
          .getByTestId('autocomplete')
          .querySelectorAll('[data-testid$="-item-group"]'),
      ]
        .map(e => e.getAttribute('data-testid'))
        .flatMap(firstOrIncorrect),
    ).toStrictEqual(['Payees']);
  });

  test('ranks an exact payee match above a longer tied substring match', async () => {
    // Payees are already alpha-sorted, so 'AAA Google' is listed first;
    // a stable sort on a tied fzf score would otherwise leave it ahead of
    // the exact 'Google' match.
    const payees = [makePayee('AAA Google'), makePayee('Google')];
    const autocomplete = renderPayeeAutocomplete({ payees });
    await clickAutocomplete(autocomplete);

    const input = autocomplete.querySelector('input')!;
    await userEvent.type(input, 'Google');
    await waitForAutocomplete();

    expect(
      [
        ...screen
          .getByTestId('autocomplete')
          .querySelectorAll(ALL_PAYEE_ITEMS_SELECTOR),
      ]
        .map(e => e.getAttribute('data-testid'))
        .flatMap(firstOrIncorrect),
    ).toStrictEqual(['Google', 'AAA Google']);
  });
});

describe('PayeeAutocomplete keyboard selection with transfer payees', () => {
  const TRANSFER_ID = 'transfer-id';

  beforeEach(() => {
    vi.mocked(useNearbyPayees).mockReturnValue(mockNearbyPayeesResult([]));
  });

  // The transfer is highlighted via ArrowDown; Tab/Enter must pick it, not
  // whichever payee sits at the same index in fzf order.
  async function pickHighlighted(
    transferName: string,
    key: '{Tab}' | '{Enter}',
    arrowDowns: number,
  ) {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(payeeQueries.listCommon().queryKey, []);
    const account = generateAccount('acct', false, false);
    const onUpdate = vi.fn();
    const onSelect = vi.fn();

    render(
      <TestProviders queryClient={queryClient}>
        <AuthProvider>
          <PayeeAutocomplete
            type="single"
            value={null}
            embedded={false}
            payees={[
              makePayee('Test A'),
              makePayee('Test B'),
              {
                id: TRANSFER_ID,
                name: transferName,
                favorite: false,
                transfer_acct: account.id,
              },
            ]}
            accounts={[account]}
            onUpdate={onUpdate}
            onSelect={onSelect}
          />
        </AuthProvider>
      </TestProviders>,
    );

    const input = screen.getByLabelText('Payee');
    await userEvent.click(input);
    await userEvent.type(input, 'Test');
    await waitForAutocomplete();
    for (let i = 0; i < arrowDowns; i++) {
      await userEvent.keyboard('{ArrowDown}');
    }
    await userEvent.keyboard(key);

    // Tab commits the value last reported through onUpdate; Enter commits
    // through onSelect (a later call than any onUpdate).
    const mock = key === '{Tab}' ? onUpdate : onSelect;
    return mock.mock.calls.at(-1)?.[0];
  }

  test.each(['{Tab}', '{Enter}'] as const)(
    '%s picks a transfer that fzf ranks above regular payees',
    async key => {
      // An exact name match starts highlighted, so no arrow keys are needed.
      expect(await pickHighlighted('Test', key, 0)).toBe(TRANSFER_ID);
    },
  );

  test.each(['{Tab}', '{Enter}'] as const)(
    '%s picks a transfer that fzf ranks below regular payees',
    async key => {
      // Highlight starts on the first payee (after 'Create payee'); the
      // transfer renders last, two rows down.
      expect(await pickHighlighted('Test Account', key, 2)).toBe(TRANSFER_ID);
    },
  );
});

describe('PayeeAutocomplete default highlight with common payees', () => {
  beforeEach(() => {
    vi.mocked(useNearbyPayees).mockReturnValue(mockNearbyPayeesResult([]));
  });

  async function typeAndCommit(typed: string, key: '{Tab}' | '{Enter}') {
    const queryClient = createTestQueryClient();
    const testStore = makePayee('Test Store', { favorite: true });
    queryClient.setQueryData(payeeQueries.listCommon().queryKey, [testStore]);
    const onUpdate = vi.fn();
    const onSelect = vi.fn();

    render(
      <TestProviders queryClient={queryClient}>
        <AuthProvider>
          <PayeeAutocomplete
            type="single"
            value={null}
            embedded={false}
            payees={[makePayee('Test'), testStore, makePayee('Tesla Motors')]}
            accounts={[]}
            onUpdate={onUpdate}
            onSelect={onSelect}
          />
        </AuthProvider>
      </TestProviders>,
    );

    const input = screen.getByLabelText('Payee');
    await userEvent.click(input);
    await userEvent.type(input, typed);
    await waitForAutocomplete();
    await userEvent.keyboard(key);

    const mock = key === '{Tab}' ? onUpdate : onSelect;
    return mock.mock.calls.at(-1)?.[0];
  }

  test.each(['{Tab}', '{Enter}'] as const)(
    '%s selects the typed exact match over a common payee',
    async key => {
      expect(await typeAndCommit('Test', key)).toBe('test-id');
    },
  );

  test.each(['{Tab}', '{Enter}'] as const)(
    '%s on a non-exact query reports the first rendered row',
    async key => {
      // Not an exact match: 'Create payee' stays first, the first rendered
      // payee row (the common payee) is highlighted.
      expect(await typeAndCommit('Tes', key)).toBe('test store-id');
    },
  );
});

describe('PayeeAutocomplete keyboard selection regressions', () => {
  async function typeAndCommit({
    typed,
    key,
    payees: testPayees,
    accounts: testAccounts = [],
    common = [],
    nearby = [],
    backspaces = 0,
  }: {
    typed: string;
    backspaces?: number;
    key: '{Tab}' | '{Enter}';
    payees: PayeeEntity[];
    accounts?: AccountEntity[];
    common?: PayeeEntity[];
    nearby?: NearbyPayeeEntity[];
  }) {
    vi.mocked(useNearbyPayees).mockReturnValue(mockNearbyPayeesResult(nearby));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(payeeQueries.listCommon().queryKey, common);
    const onUpdate = vi.fn();
    const onSelect = vi.fn();

    render(
      <TestProviders queryClient={queryClient}>
        <AuthProvider>
          <PayeeAutocomplete
            type="single"
            value={null}
            embedded={false}
            payees={testPayees}
            accounts={testAccounts}
            onUpdate={onUpdate}
            onSelect={onSelect}
          />
        </AuthProvider>
      </TestProviders>,
    );

    const input = screen.getByLabelText('Payee');
    await userEvent.click(input);
    await userEvent.type(input, typed);
    if (backspaces > 0) {
      await userEvent.keyboard('{Backspace}'.repeat(backspaces));
    }
    await waitForAutocomplete();
    await userEvent.keyboard(key);

    const mock = key === '{Tab}' ? onUpdate : onSelect;
    return mock.mock.calls.at(-1)?.[0];
  }

  test.each([
    ['{Tab}', 'zed ba-id'],
    ['{Enter}', 'zed bar-id'],
  ] as const)(
    '%s keeps the nearby highlight when the last backspace makes a nearby payee match',
    async (key, expected) => {
      const zedBarFee = makePayee('Zed Bar Fee', { favorite: true });
      const zedBa = makePayee('Zed Ba');
      expect(
        await typeAndCommit({
          typed: 'Zed Bax',
          backspaces: 1,
          key,
          payees: [
            zedBarFee,
            zedBa,
            {
              id: 'zed-transfer-id',
              name: 'Zed Ba',
              favorite: false,
              transfer_acct: generateAccount('acct', false, false).id,
            },
          ],
          accounts: [generateAccount('acct', false, false)],
          common: [zedBarFee],
          nearby: [makeNearbyPayee('Zed Bar', 10)],
        }),
      ).toBe(expected);
    },
  );

  test.each([
    ['{Tab}', 'test-id'],
    // Enter commits the highlighted row, the first nearby payee.
    ['{Enter}', 'test cafe-id'],
  ] as const)(
    '%s with nearby payees present keeps the unsorted suggestion order',
    async (key, expected) => {
      const testStore = makePayee('Test Store', { favorite: true });
      expect(
        await typeAndCommit({
          typed: 'Test',
          key,
          payees: [makePayee('Test'), testStore],
          common: [testStore],
          nearby: [makeNearbyPayee('Test Cafe', 10)],
        }),
      ).toBe(expected);
    },
  );

  test.each(['{Tab}', '{Enter}'] as const)(
    '%s picks a transfer whose name exactly matches the typed text',
    async key => {
      const account = generateAccount('acct', false, false);
      expect(
        await typeAndCommit({
          typed: 'Ally Savings',
          key,
          payees: [
            makePayee('Ally Savings Fee'),
            {
              id: 'ally-transfer-id',
              name: 'Ally Savings',
              favorite: false,
              transfer_acct: account.id,
            },
          ],
          accounts: [account],
        }),
      ).toBe('ally-transfer-id');
    },
  );
});
