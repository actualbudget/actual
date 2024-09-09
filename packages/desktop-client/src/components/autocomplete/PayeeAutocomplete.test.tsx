import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { generateAccount } from 'loot-core/src/mocks';
import { TestProvider } from 'loot-core/src/mocks/redux';

import { useCommonPayees } from '../../hooks/usePayees';
import { ResponsiveProvider } from '../../ResponsiveProvider';

import { PayeeAutocomplete } from './PayeeAutocomplete';

const PAYEE_SELECTOR = '[data-testid][role=option]';
const PAYEE_SECTION_SELECTOR = '[data-testid$="-item-group"]';

const payees = [
  makePayee('Bob', { favorite: true }),
  makePayee('Alice', { favorite: true }),
  makePayee('This guy on the side of the road'),
];

const defaultProps = {
  value: '',
  embedded: true,
  payees,
  accounts: [generateAccount('Bank of Montreal', false, false)],
};

function makePayee(name: string, options?: { favorite: boolean }) {
  return {
    id: name.toLowerCase() + '-id',
    name,
    favorite: options?.favorite ?? false,
    transfer_acct: null,
    category: null,
  };
}

function extractPayeesAndHeaderNames(screen) {
  return [
    ...screen
      .getByTestId('autocomplete')
      .querySelectorAll(`${PAYEE_SELECTOR}, ${PAYEE_SECTION_SELECTOR}`),
  ]
    .map(e => e.getAttribute('data-testid'))
    .flatMap(id => id.split('-', 1));
}

function renderPayeeAutocomplete(props?) {
  const autocompleteProps = {
    ...defaultProps,
    ...props,
  };

  render(
    <TestProvider>
      <ResponsiveProvider>
        <div data-testid="autocomplete-test">
          <PayeeAutocomplete {...autocompleteProps} />
        </div>
      </ResponsiveProvider>
    </TestProvider>,
  );
  return screen.getByTestId('autocomplete-test');
}

// Not good, see `Autocomplete.js` for details
function waitForAutocomplete() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function clickAutocomplete(autocomplete) {
  await userEvent.click(autocomplete.querySelector(`input`));
  await waitForAutocomplete();
}

vi.mock('../../hooks/usePayees', () => ({
  useCommonPayees: vi.fn(),
  usePayees: vi.fn().mockReturnValue([]),
}));

describe('PayeeAutocomplete.getPayeeSuggestions', () => {
  beforeEach(() => {
    vi.mocked(useCommonPayees).mockReturnValue([]);
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
    const payees = [
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
    const autocomplete = renderPayeeAutocomplete({ payees });
    await clickAutocomplete(autocomplete);

    expect(
      [
        ...screen
          .getByTestId('autocomplete')
          .querySelectorAll(`${PAYEE_SELECTOR}, ${PAYEE_SECTION_SELECTOR}`),
      ]
        .map(e => e.getAttribute('data-testid'))
        .flatMap(id => id.split('-', 1)),
    ).toStrictEqual(expectedPayeeOrder);
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
        .flatMap(id => id.split('-', 1)),
    ).toStrictEqual(expectedPayeeOrder);
    expect(
      [
        ...screen
          .getByTestId('autocomplete')
          .querySelectorAll('[data-testid$="-item-group"]'),
      ]
        .map(e => e.getAttribute('data-testid'))
        .flatMap(id => id.split('-', 1)),
    ).toStrictEqual(['Payees']);
  });
});
