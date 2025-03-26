import { installAPI } from './api';
import { getBankSyncError } from '../shared/errors';

jest.mock('../shared/errors', () => ({
  getBankSyncError: jest.fn(error => `Bank sync error: ${error}`),
}));

describe('API handlers', () => {
  let handlers: Record<string, any>;
  let mockServerHandlers: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServerHandlers = {
      'accounts-bank-sync': jest.fn().mockResolvedValue({ errors: [] }),
    };

    // Remove the accounts-bank-sync handler if it exists
    // or it won't be replaced by the mock
    if (handlers) {
      delete handlers['accounts-bank-sync'];
    }

    handlers = installAPI(mockServerHandlers);
  });

  describe('api/bank-sync', () => {
    it('should sync a single account when accountId is provided', async () => {
      await handlers['api/bank-sync']({ accountId: 'account1' });
      expect(mockServerHandlers['accounts-bank-sync']).toHaveBeenCalledWith({
        ids: ['account1'],
      });
    });

    it('should handle errors in non batch sync', async () => {
      mockServerHandlers['accounts-bank-sync'].mockResolvedValue({
        errors: ['connection-failed'],
      });

      await expect(
        handlers['api/bank-sync']({ accountId: 'account2' }),
      ).rejects.toThrow('Bank sync error: connection-failed');

      expect(getBankSyncError).toHaveBeenCalledWith('connection-failed');
    });
  });
});
