import { getCurrentMutatorRequestId, runMutator } from './mutators';

describe('getCurrentMutatorRequestId', () => {
  it('returns undefined when no mutator is running', () => {
    expect(getCurrentMutatorRequestId()).toBeUndefined();
  });

  it('preserves the request ID while a mutator is running', async () => {
    await runMutator(
      async () => {
        expect(getCurrentMutatorRequestId()).toBe('edit-from-tab-a');

        await Promise.resolve();

        expect(getCurrentMutatorRequestId()).toBe('edit-from-tab-a');
      },
      { requestId: 'edit-from-tab-a' },
    );

    expect(getCurrentMutatorRequestId()).toBeUndefined();
  });
});
