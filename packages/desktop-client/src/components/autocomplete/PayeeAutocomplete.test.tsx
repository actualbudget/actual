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

describe('PayeeAutocomplete with a payee set and nothing typed', () => {
  const transferPayee: PayeeEntity = {
    id: 'transfer-id',
    name: 'Test',
    favorite: false,
    transfer_acct: accounts[0].id,
  };
  const testA = makePayee('Test A');
  const testB = makePayee('Test B');
  const testC = makePayee('Test C');

  const scenarios = {
    // The payees in the order the list draws them.
    plain: { payees: [testA, testB, transferPayee], nearbyPayees: [] },
    // The nearby payee is drawn first, in front of the other payees.
    nearby: {
      payees: [testA, testB, testC, transferPayee],
      nearbyPayees: [makeNearbyPayee('Test C', 0.2)],
    },
    // The transfer payee comes first in `payees` but is drawn last.
    transferFirst: { payees: [transferPayee, testA, testB], nearbyPayees: [] },
  };

  async function arrowDownThenKey(
    scenario: keyof typeof scenarios,
    arrowDowns: number,
    key: '{Tab}' | '{Enter}',
  ) {
    const { payees, nearbyPayees } = scenarios[scenario];
    vi.mocked(useNearbyPayees).mockReturnValue(
      mockNearbyPayeesResult(nearbyPayees),
    );
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(payeeQueries.listCommon().queryKey, []);
    const onUpdate = vi.fn();
    const onSelect = vi.fn();

    render(
      <TestProviders queryClient={queryClient}>
        <AuthProvider>
          <PayeeAutocomplete
            type="single"
            value={testB.id}
            embedded={false}
            payees={payees}
            accounts={accounts}
            onUpdate={onUpdate}
            onSelect={onSelect}
          />
        </AuthProvider>
      </TestProviders>,
    );

    await userEvent.click(screen.getByLabelText('Payee'));
    for (let i = 0; i < arrowDowns; i++) {
      await userEvent.keyboard('{ArrowDown}');
    }
    const highlighted = document
      .querySelector('[data-highlighted]')
      ?.getAttribute('data-testid');
    await userEvent.keyboard(key);
    await waitForAutocomplete();

    // A table saves the value last reported through onUpdate on Tab, and the
    // one passed to onSelect on Enter.
    const calls = key === '{Tab}' ? onUpdate.mock.calls : onSelect.mock.calls;
    return { highlighted, committed: calls.at(-1)?.[0] };
  }

  const cases: [keyof typeof scenarios, number, string, string][] = [
    ['plain', 1, 'Test A-payee-item', testA.id],
    ['plain', 2, 'Test B-payee-item', testB.id],
    ['plain', 3, 'Test-payee-item', transferPayee.id],
    ['nearby', 1, 'Test C-payee-item', testC.id],
    ['nearby', 2, 'Test A-payee-item', testA.id],
    ['nearby', 5, 'Test-payee-item', transferPayee.id],
    ['transferFirst', 1, 'Test A-payee-item', testA.id],
    ['transferFirst', 3, 'Test-payee-item', transferPayee.id],
  ];

  test.each(cases)(
    '%s list, ArrowDown %i time(s), Tab takes the highlighted row',
    async (scenario, arrowDowns, row, id) => {
      const { highlighted, committed } = await arrowDownThenKey(
        scenario,
        arrowDowns,
        '{Tab}',
      );
      expect(highlighted).toBe(row);
      expect(committed).toBe(id);
    },
  );

  test.each(cases)(
    '%s list, ArrowDown %i time(s), Enter takes the highlighted row',
    async (scenario, arrowDowns, row, id) => {
      const { highlighted, committed } = await arrowDownThenKey(
        scenario,
        arrowDowns,
        '{Enter}',
      );
      expect(highlighted).toBe(row);
      expect(committed).toBe(id);
    },
  );
});

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
