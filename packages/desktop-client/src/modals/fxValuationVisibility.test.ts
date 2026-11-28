import { setAppState } from '#app/appSlice';

import { getInitialState, pushModal, reducer } from './modalsSlice';

it('closes valuation details when the budget becomes hidden, retaining unrelated dialogs', () => {
  let state = reducer(
    getInitialState(),
    pushModal({
      modal: { name: 'fx-valuation', options: { month: '2016-12' } },
    }),
  );
  state = reducer(
    state,
    pushModal({
      modal: {
        name: 'envelope-budget-summary',
        options: {
          month: '2016-12',
          onBudgetAction: vi.fn().mockResolvedValue(undefined),
        },
      },
    }),
  );
  state = reducer(state, setAppState({ loadingText: 'Loading' }));
  expect(state.modalStack.map(modal => modal.name)).toEqual([
    'envelope-budget-summary',
  ]);
  state = reducer(state, setAppState({ loadingText: null }));
  expect(state.modalStack.map(modal => modal.name)).toEqual([
    'envelope-budget-summary',
  ]);
});
