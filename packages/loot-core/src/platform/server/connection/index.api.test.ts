import { afterEach, expect, test, vi } from 'vitest';

// oxlint-disable-next-line no-restricted-imports
import { send } from './index.api';

afterEach(() => {
  vi.restoreAllMocks();
});

test('warns the script author about deferred and dropped sync messages only', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  send('sync-event', { type: 'success', tables: [] });
  expect(warn).not.toHaveBeenCalled();

  send('sync-event', { type: 'deferred-messages' });
  send('sync-event', { type: 'dropped-messages' });
  expect(warn).toHaveBeenCalledTimes(2);
});
