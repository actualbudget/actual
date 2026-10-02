import type { ReactNode } from 'react';

import { render } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { AccountAutocompleteModal } from './AccountAutocompleteModal';
import { CategoryAutocompleteModal } from './CategoryAutocompleteModal';
import { PayeeAutocompleteModal } from './PayeeAutocompleteModal';

const { useResponsiveMock } = vi.hoisted(() => ({
  useResponsiveMock: vi.fn(),
}));
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: useResponsiveMock,
}));

const { categoryAutocompleteSpy } = vi.hoisted(() => ({
  categoryAutocompleteSpy: vi.fn(),
}));
vi.mock('#components/autocomplete/CategoryAutocomplete', () => ({
  CategoryAutocomplete: (props: Record<string, unknown>) => {
    categoryAutocompleteSpy(props);
    return null;
  },
}));

const { payeeAutocompleteSpy } = vi.hoisted(() => ({
  payeeAutocompleteSpy: vi.fn(),
}));
vi.mock('#components/autocomplete/PayeeAutocomplete', () => ({
  PayeeAutocomplete: (props: Record<string, unknown>) => {
    payeeAutocompleteSpy(props);
    return null;
  },
}));

const { accountAutocompleteSpy } = vi.hoisted(() => ({
  accountAutocompleteSpy: vi.fn(),
}));
vi.mock('#components/autocomplete/AccountAutocomplete', () => ({
  AccountAutocomplete: (props: Record<string, unknown>) => {
    accountAutocompleteSpy(props);
    return null;
  },
}));

vi.mock('#hooks/usePayees', () => ({ usePayees: () => ({ data: [] }) }));
vi.mock('#hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('#hooks/useNavigate', () => ({ useNavigate: () => vi.fn() }));

function renderWithProviders(children: ReactNode) {
  render(<TestProviders>{children}</TestProviders>);
}

describe.each([
  { isNarrowWidth: true, expectedFocused: false, label: 'narrow (mobile)' },
  {
    isNarrowWidth: false,
    expectedFocused: true,
    label: 'not narrow (desktop)',
  },
])(
  'autocomplete modal auto-focus - $label',
  ({ isNarrowWidth, expectedFocused }) => {
    beforeEach(() => {
      useResponsiveMock.mockReturnValue({ isNarrowWidth });
    });

    it(`CategoryAutocompleteModal passes focused=${expectedFocused}`, () => {
      renderWithProviders(
        <CategoryAutocompleteModal
          onSelect={vi.fn()}
          categoryGroups={[]}
          showHiddenCategories={false}
          onClose={vi.fn()}
        />,
      );
      expect(categoryAutocompleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ focused: expectedFocused }),
      );
    });

    it(`PayeeAutocompleteModal passes focused=${expectedFocused}`, () => {
      renderWithProviders(
        <PayeeAutocompleteModal onSelect={vi.fn()} onClose={vi.fn()} />,
      );
      expect(payeeAutocompleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ focused: expectedFocused }),
      );
    });

    it(`AccountAutocompleteModal passes focused=${expectedFocused}`, () => {
      renderWithProviders(
        <AccountAutocompleteModal onSelect={vi.fn()} onClose={vi.fn()} />,
      );
      expect(accountAutocompleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ focused: expectedFocused }),
      );
    });
  },
);
