import * as connection from '#platform/server/connection';

import { fetchQuiet } from './index';

vi.mock('#platform/server/connection', () => ({ send: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('keeps browser redirect handling on the quiet path', async () => {
  const response = new Response('');
  Object.defineProperty(response, 'type', { value: 'opaqueredirect' });
  const network = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', network);
  await expect(
    fetchQuiet('https://sync.example.com/exchange-rates/providers'),
  ).rejects.toThrow('API request redirected');
  expect(network).toHaveBeenCalledWith(
    'https://sync.example.com/exchange-rates/providers',
    { redirect: 'manual' },
  );
  expect(connection.send).toHaveBeenCalledWith('api-fetch-redirected');
});
