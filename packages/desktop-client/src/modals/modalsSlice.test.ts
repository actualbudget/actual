import {
  getInitialState,
  pushModal,
  reducer,
  removeModal,
} from './modalsSlice';

it('removes one modal by name and keeps the identities of the others', () => {
  let state = getInitialState();
  for (const name of [
    'goal-templates',
    'files-settings',
    'goal-templates',
  ] as const) {
    state = reducer(state, pushModal({ modal: { name } }));
  }
  const [first, , last] = state.modalStack;
  state = reducer(state, removeModal({ name: 'files-settings' }));
  expect(state.modalStack.map(m => m.id)).toEqual([first.id, last.id]);
  expect(new Set([first.id, last.id]).size).toBe(2);
});
