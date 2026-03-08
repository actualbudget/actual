import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enableBankingService } from '../services/enablebanking-services.js';

describe('SessionStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clear all sessions to prevent test pollution
    enableBankingService.clearAllSessions();
  });

  describe('Session Management', () => {
    it('should store and retrieve session by fail state', () => {
      const state = 'test-state-123';
      const error = 'Test error';

      enableBankingService.failSession(state, error);

      const retrieved = enableBankingService.getSessionEntry(state);
      expect(retrieved).toBeDefined();
      expect(retrieved?.error).toBe(error);
    });

    it('should return undefined for non-existent state', () => {
      const retrieved =
        enableBankingService.getSessionIdFromState('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should store failure state with error message', () => {
      const state = 'failed-state-with-error';
      const errorMessage = 'Authentication failed';

      enableBankingService.failSession(state, errorMessage);

      const entry = enableBankingService.getSessionEntry(state);
      expect(entry).toBeDefined();
      expect(entry?.sessionId).toBeNull();
      expect(entry?.error).toBe(errorMessage);
    });

    it('should return undefined sessionId for failed sessions', () => {
      const state = 'failed-state-sessionid-check';
      enableBankingService.failSession(state, 'Error occurred');

      const sessionId = enableBankingService.getSessionIdFromState(state);
      expect(sessionId).toBeUndefined();
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire session after TTL (30 minutes)', () => {
      const state = 'ttl-expiration-test';
      const errorMessage = 'Test error';

      enableBankingService.failSession(state, errorMessage);

      // Verify session exists initially
      expect(enableBankingService.getSessionEntry(state)).toBeDefined();

      // Advance time by 29 minutes (should still exist)
      vi.advanceTimersByTime(29 * 60 * 1000);
      expect(enableBankingService.getSessionEntry(state)).toBeDefined();

      // Advance time by 2 more minutes (31 total - should be expired)
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(enableBankingService.getSessionEntry(state)).toBeUndefined();
    });

    it('should expire failed sessions after TTL', () => {
      const state = 'ttl-failed-session-test';
      const error = 'Test error';

      enableBankingService.failSession(state, error);

      // Verify failure entry exists initially
      expect(enableBankingService.getSessionEntry(state)?.error).toBe(error);

      // Advance time past TTL
      vi.advanceTimersByTime(31 * 60 * 1000);
      expect(enableBankingService.getSessionEntry(state)).toBeUndefined();
    });

    it('should delete expired sessions when accessed', () => {
      const state = 'delete-on-access-test';
      const error = 'Test error';

      enableBankingService.failSession(state, error);

      // Advance time past expiration
      vi.advanceTimersByTime(31 * 60 * 1000);

      // First access should return undefined (session was deleted)
      expect(enableBankingService.getSessionEntry(state)).toBeUndefined();
    });
  });

  describe('Cleanup', () => {
    it('should remove expired sessions automatically', () => {
      const state = 'auto-cleanup-expiry-test';
      const error = 'Test error';

      enableBankingService.failSession(state, error);

      // Verify session exists
      expect(enableBankingService.getSessionEntry(state)).toBeDefined();

      // Advance time past expiration
      vi.advanceTimersByTime(31 * 60 * 1000);

      // Session should be expired when accessed
      expect(enableBankingService.getSessionEntry(state)).toBeUndefined();
    });

    it('should keep non-expired sessions', () => {
      const state = 'non-expired-session-test';
      const error = 'Test error';

      enableBankingService.failSession(state, error);

      // Verify session exists
      expect(enableBankingService.getSessionEntry(state)).toBeDefined();

      // Advance time by only 10 minutes (well within TTL)
      vi.advanceTimersByTime(10 * 60 * 1000);

      // Session should still exist
      expect(enableBankingService.getSessionEntry(state)).toBeDefined();
    });
  });

  describe('Multiple Sessions', () => {
    it('should handle multiple concurrent sessions', () => {
      const states = ['concurrent-1', 'concurrent-2', 'concurrent-3'];

      states.forEach(state => {
        enableBankingService.failSession(state, `Error for ${state}`);
      });

      // Verify all sessions are retrievable
      states.forEach(state => {
        expect(enableBankingService.getSessionEntry(state)).toBeDefined();
      });
    });

    it('should overwrite existing session for same state', () => {
      const state = 'overwrite-test-state';

      enableBankingService.failSession(state, 'First error');
      expect(enableBankingService.getSessionEntry(state)?.error).toBe(
        'First error',
      );

      enableBankingService.failSession(state, 'Second error');
      expect(enableBankingService.getSessionEntry(state)?.error).toBe(
        'Second error',
      );
    });
  });
});
