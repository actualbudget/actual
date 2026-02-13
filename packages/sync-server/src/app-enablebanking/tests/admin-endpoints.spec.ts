import { afterEach, describe, expect, it, vi } from 'vitest';

import { enableBankingservice } from '../services/enablebanking-services';

/**
 * Admin Endpoint Tests
 *
 * The admin endpoint POST /admin/clear_sessions follows the established
 * pattern from app-admin.js:
 * - Requires validateSessionMiddleware
 * - Checks isAdmin(res.locals.user_id)
 * - Returns 403 if not admin
 * - Calls enableBankingservice.clearAllSessions()
 * - Returns: { status: 'ok', data: { cleared: <count> } }
 *
 * Integration testing with Express middleware and res.locals is covered
 * by existing app-admin.test.js patterns. Here we test the service layer.
 */
describe('Enable Banking Admin Features', () => {
  afterEach(() => {
    enableBankingservice.clearAllSessions();
  });

  describe('clearAllSessions service method', () => {
    it('should return zero when no sessions exist', () => {
      const cleared = enableBankingservice.clearAllSessions();
      expect(cleared).toBe(0);
    });

    it('should emit audit log with timestamp and count', () => {
      const consoleSpy = vi.spyOn(console, 'info');

      const cleared = enableBankingservice.clearAllSessions();

      expect(cleared).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[AUDIT\] clearAllSessions: Cleared 0 session\(s\) at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/,
        ),
      );

      consoleSpy.mockRestore();
    });

    it('should be callable multiple times safely', () => {
      const firstClear = enableBankingservice.clearAllSessions();
      const secondClear = enableBankingservice.clearAllSessions();

      expect(firstClear).toBe(0);
      expect(secondClear).toBe(0);
    });
  });
});
