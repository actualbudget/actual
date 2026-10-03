import type { TransactionEntity } from '@actual-app/core/types/models';

import {
  fromRegisterView,
  toForeignDraft,
  toRegisterView,
} from './registerView';

const stored = {
  id: 'a',
  account: 'jpy',
  date: '2026-03-10',
  amount: -1000,
  transaction_amount: -1500,
} satisfies TransactionEntity;

it('shows native amounts and restores the stored pair exactly', () => {
  const [view] = toRegisterView([stored], true);
  expect(view).toMatchObject({ amount: -1500, _baseAmount: -1000 });
  expect(fromRegisterView([view])).toEqual([stored]);
});

it('leaves base registers and base rows untouched', () => {
  const base = { ...stored, transaction_amount: null };
  expect(toRegisterView([stored], false)).toEqual([stored]);
  expect(fromRegisterView(toRegisterView([base], true))).toEqual([base]);
});

it('maps a row already in view form only once', () => {
  const view = toRegisterView([stored], true);
  expect(toRegisterView(view, true)).toEqual(view);
});

it('builds a foreign draft with a deferred new payee', () => {
  const [view] = toRegisterView([{ ...stored, payee: 'new:Ramen' }], true);
  expect(toForeignDraft(view)).toEqual({
    id: 'a',
    account: 'jpy',
    date: '2026-03-10',
    transaction_amount: -1500,
    payee: null,
    payee_name: 'Ramen',
  });
});
