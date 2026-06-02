import { describe, expect, it, vi } from 'vitest';

import * as asyncStorage from '#platform/server/asyncStorage';
import { fetch } from '#platform/server/fetch';
import { getServer } from '#server/server-config';

import { app } from './app';

vi.mock('#platform/server/asyncStorage', () => ({
  getItem: vi.fn(),
}));

vi.mock('#platform/server/fetch', () => ({
  fetch: vi.fn(),
}));

vi.mock('#server/server-config', () => ({
  getServer: vi.fn(),
}));

describe('plugins app', () => {
  describe('cors-proxy', () => {
    it('forwards plugin requests through the configured sync-server proxy', async () => {
      vi.mocked(asyncStorage.getItem).mockResolvedValue('user-token-123');
      vi.mocked(getServer).mockReturnValue({
        BASE_SERVER: 'https://actual.example',
        SYNC_SERVER: 'https://actual.example/sync',
        SIGNUP_SERVER: 'https://actual.example/account',
        GOCARDLESS_SERVER: 'https://actual.example/gocardless',
        SIMPLEFIN_SERVER: 'https://actual.example/simplefin',
        PLUGGYAI_SERVER: 'https://actual.example/pluggyai',
        ENABLEBANKING_SERVER: 'https://actual.example/enablebanking',
        CORS_PROXY: 'https://actual.example/cors-proxy',
      });
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        }),
      );

      const result = await app.handlers['cors-proxy']({
        url: 'https://plugins.example/manifest.json',
        method: 'POST',
        body: { plugin: true },
        headers: { 'x-plugin-header': 'yes' },
      });

      expect(result).toEqual({ ok: true });
      expect(fetch).toHaveBeenCalledWith(
        'https://actual.example/cors-proxy?url=https%3A%2F%2Fplugins.example%2Fmanifest.json',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-ACTUAL-TOKEN': 'user-token-123',
            'Content-Type': 'application/json',
            'x-plugin-header': 'yes',
          }),
        }),
      );

      const [, requestInit] = vi.mocked(fetch).mock.calls[0];
      expect(JSON.parse(String(requestInit?.body))).toEqual({
        method: 'POST',
        body: { plugin: true },
        headers: {
          'x-requested-with': 'actual-budget',
          'user-agent': 'Actual-Budget-Plugin-System',
          'x-plugin-header': 'yes',
        },
      });
    });

    it('does not proxy without a user token', async () => {
      vi.mocked(asyncStorage.getItem).mockResolvedValue(null);

      await expect(
        app.handlers['cors-proxy']({
          url: 'https://plugins.example/manifest.json',
        }),
      ).resolves.toEqual({ error: 'unauthorized' });

      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
