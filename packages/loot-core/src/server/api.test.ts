import { getBankSyncError } from '../shared/errors';
import { ServerHandlers } from '../types/server-handlers';

import { installAPI } from './api';
jest.mock('../shared/errors', () => ({
  getBankSyncError: jest.fn(error => `Bank sync error: ${error}`),
}));

describe('API handlers', () => {
  const handlers = installAPI({} as unknown as ServerHandlers);

  describe('api/bank-sync', () => {
    it('should sync a single account when accountId is provided', async () => {
      handlers['accounts-bank-sync'] = jest
        .fn()
        .mockResolvedValue({ errors: [] });

      await handlers['api/bank-sync']({ accountId: 'account1' });
      expect(handlers['accounts-bank-sync']).toHaveBeenCalledWith({
        ids: ['account1'],
      });
    });

    it('should handle errors in non batch sync', async () => {
      handlers['accounts-bank-sync'] = jest.fn().mockResolvedValue({
        errors: ['connection-failed'],
      });

      await expect(
        handlers['api/bank-sync']({ accountId: 'account2' }),
      ).rejects.toThrow('Bank sync error: connection-failed');

      expect(getBankSyncError).toHaveBeenCalledWith('connection-failed');
    });
  });
});
