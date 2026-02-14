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

    it('should actually clear created sessions', () => {
      // Create sessions by marking them as failed
      const state1 = 'test-state-1';
      const state2 = 'test-state-2';
      const state3 = 'test-state-3';

      enableBankingservice.failSession(state1, 'test error 1');
      enableBankingservice.failSession(state2, 'test error 2');
      enableBankingservice.failSession(state3, 'test error 3');

      // Verify sessions were created
      const entry1 = enableBankingservice.getSessionEntry(state1);
      const entry2 = enableBankingservice.getSessionEntry(state2);
      const entry3 = enableBankingservice.getSessionEntry(state3);

      expect(entry1).toBeDefined();
      expect(entry2).toBeDefined();
      expect(entry3).toBeDefined();

      // Clear all sessions and verify count
      const cleared = enableBankingservice.clearAllSessions();
      expect(cleared).toBe(3);

      // Verify sessions are actually removed
      expect(enableBankingservice.getSessionEntry(state1)).toBeUndefined();
      expect(enableBankingservice.getSessionEntry(state2)).toBeUndefined();
      expect(enableBankingservice.getSessionEntry(state3)).toBeUndefined();

      // Subsequent clear should return 0
      const secondClear = enableBankingservice.clearAllSessions();
      expect(secondClear).toBe(0);
    });
  });
});
