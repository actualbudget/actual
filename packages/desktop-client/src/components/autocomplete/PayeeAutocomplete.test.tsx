import { render, screen, type Screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { generateAccount } from 'loot-core/mocks';
import type { AccountEntity, PayeeEntity } from 'loot-core/types/models';

import {
  PayeeAutocomplete,
  type PayeeAutocompleteProps,
} from './PayeeAutocomplete';

import { AuthProvider } from '@desktop-client/auth/AuthProvider';
import {
  useCommonPayees,
  useNearbyPayees,
} from '@desktop-client/hooks/usePayees';
import { TestProvider } from '@desktop-client/redux/mock';

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

function makeNearbyPayee(name: string, distance: number): PayeeEntity {
  const id = name.toLowerCase() + '-id';
  return {
    id,
    name,
    favorite: false,
    transfer_acct: undefined,
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

function renderPayeeAutocomplete(
  props?: Partial<PayeeAutocompleteProps>,
): HTMLElement {
  const autocompleteProps = {
    ...defaultProps,
    ...props,
  };

  render(
    <TestProvider>
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
    </TestProvider>,
  );
  return screen.getByTestId('autocomplete-test');
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

vi.mock('../../hooks/usePayees', () => ({
  useCommonPayees: vi.fn(),
  usePayees: vi.fn().mockReturnValue([]),
  useNearbyPayees: vi.fn().mockReturnValue([]),
}));

function firstOrIncorrect(id: string | null): string {
  return id?.split('-', 1)[0] || 'incorrect';
}

describe('PayeeAutocomplete.getPayeeSuggestions', () => {
  beforeEach(() => {
    vi.mocked(useCommonPayees).mockReturnValue([]);
    vi.mocked(useNearbyPayees).mockReturnValue([]);
  });

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
    vi.mocked(useCommonPayees).mockReturnValue([
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
    vi.mocked(useCommonPayees).mockReturnValue([
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
    vi.mocked(useNearbyPayees).mockReturnValue(nearbyPayees);

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
    vi.mocked(useNearbyPayees).mockReturnValue(nearbyPayees);

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
    vi.mocked(useNearbyPayees).mockReturnValue(nearbyPayees);
    vi.mocked(useCommonPayees).mockReturnValue([
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
    vi.mocked(useNearbyPayees).mockReturnValue(nearbyPayees);

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
});
