import { init as initLootCore } from '@actual-app/core/server/main';
import { describe, expect, it, vi } from 'vitest';

import * as api from './index';

vi.mock('@actual-app/core/server/main', () => ({
  init: vi.fn(async () => ({
    send: vi.fn(),
  })),
}));

describe('init', () => {
  it('passes explicit password login method when initializing remote API with a password', async () => {
    await api.init({
      serverURL: 'https://actual.example.com',
      password: 'test-password',
    });

    expect(initLootCore).toHaveBeenCalledWith({
      serverURL: 'https://actual.example.com',
      password: 'test-password',
      loginMethod: 'password',
    });
  });
});
