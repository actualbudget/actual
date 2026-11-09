import { initServer } from '@actual-app/core/platform/client/connection';
import type { TFunction } from 'i18next';

import { addCurrencyLine } from './categoryCurrencyModals';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const category = { id: 'food', name: 'Food' };
const t = ((key: string) => key) as unknown as TFunction;

describe('addCurrencyLine', () => {
  it('adds the line from the month on screen without asking', async () => {
    const add = vi.fn(async () => 'food-USD');
    initServer({ 'category-currency-add': add });
    const dispatch = vi.fn();

    await addCurrencyLine(dispatch, t, category, 'USD', '2026-10');
    expect(add).toHaveBeenCalledWith({
      category: 'food',
      currency: 'USD',
      startMonth: '2026-10',
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('says so when the line could not be added', async () => {
    initServer({
      'category-currency-add': async () => {
        throw new Error('The category already has a USD line');
      },
    });
    const dispatch = vi.fn();

    await addCurrencyLine(dispatch, t, category, 'USD', '2026-10');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          notification: expect.objectContaining({ type: 'error' }),
        }),
      }),
    );
  });
});
