import type { ReactNode } from 'react';

import type { PayeeEntity } from '@actual-app/core/types/models';
import { render } from '@testing-library/react';

import { PayeeAutocompleteModal } from './PayeeAutocompleteModal';

const shown = vi.hoisted(() => ({ payees: [] as PayeeEntity[] }));

vi.mock('#components/autocomplete/PayeeAutocomplete', () => ({
  PayeeAutocomplete: ({ payees }: { payees: PayeeEntity[] }) => {
    shown.payees = payees;
    return null;
  },
}));
vi.mock('#components/common/Modal', () => ({
  Modal: ({
    children,
  }: {
    children: (state: { state: { close: () => void } }) => ReactNode;
  }) => children({ state: { close: vi.fn() } }),
  ModalHeader: () => null,
  ModalCloseButton: () => null,
  ModalTitle: () => null,
}));
vi.mock('#hooks/usePayees', () => ({
  usePayees: () => ({
    data: [
      { id: 'shop', name: 'Shop', transfer_acct: null },
      { id: 'to-usd', name: '', transfer_acct: 'usd' },
      { id: 'to-jpy', name: '', transfer_acct: 'jpy' },
    ],
  }),
}));
vi.mock('#hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('#hooks/useNavigate', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));

const ids = () => shown.payees.map(p => p.id);

it('leaves out transfers to excluded accounts', () => {
  render(
    <PayeeAutocompleteModal
      onSelect={vi.fn()}
      excludeTransferAccounts={['jpy']}
    />,
  );
  expect(ids()).toEqual(['shop', 'to-usd']);
});

it('keeps every payee by default and hides all transfers when asked', () => {
  render(<PayeeAutocompleteModal onSelect={vi.fn()} />);
  expect(ids()).toEqual(['shop', 'to-usd', 'to-jpy']);
  render(<PayeeAutocompleteModal onSelect={vi.fn()} hideTransferPayees />);
  expect(ids()).toEqual(['shop']);
});
