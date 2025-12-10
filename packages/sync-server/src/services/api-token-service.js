import crypto from 'crypto';

import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { getAccountDb } from '../account-db';
import { TOKEN_EXPIRATION_NEVER } from '../util/validate-user';

const TOKEN_PREFIX = 'act_';
const TOKEN_RANDOM_BYTES = 24; // 32 chars when base64url encoded
const BCRYPT_ROUNDS = 12;

/**
 * Generate a secure random API token
 * Format: act_<32 random chars>
 */
function generateToken() {
  const randomBytes = crypto.randomBytes(TOKEN_RANDOM_BYTES);
  const randomPart = randomBytes
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 32);
  return `${TOKEN_PREFIX}${randomPart}`;
}

/**
 * Extract the prefix portion of a token for lookup
 * @param {string} token - The full token
 * @returns {string} The prefix (first 12 chars: "act_" + 8 chars)
 */
function extractPrefix(token) {
  return token.slice(0, 12);
}

/**
 * Hash a token using bcrypt
 * @param {string} token - The token to hash
 * @returns {string} The bcrypt hash
 */
function hashToken(token) {
  return bcrypt.hashSync(token, BCRYPT_ROUNDS);
}

/**
 * Verify a token against a hash
 * @param {string} token - The token to verify
 * @param {string} hash - The bcrypt hash to compare against
 * @returns {boolean} True if the token matches
 */
function verifyToken(token, hash) {
  return bcrypt.compareSync(token, hash);
}

export const apiTokenService = {
  /**
   * Create a new API token for a user
   * @param {string} userId - The user ID
   * @param {string} name - A friendly name for the token
   * @param {string[]} budgetIds - Array of budget/file IDs to scope the token to (empty = all)
   * @param {number|null} expiresAt - Unix timestamp for expiration, or null for never
   * @returns {{ id: string, token: string, prefix: string, name: string, budgetIds: string[], createdAt: number }}
   */
  createToken(userId, name, budgetIds = [], expiresAt = null) {
    const accountDb = getAccountDb();
    const token = generateToken();
    const tokenHash = hashToken(token);
    const tokenPrefix = extractPrefix(token);
    const tokenId = uuidv4();
    const createdAt = Math.floor(Date.now() / 1000);
    const expiration = expiresAt ?? TOKEN_EXPIRATION_NEVER;

    accountDb.transaction(() => {
      accountDb.mutate(
        `INSERT INTO api_tokens (id, user_id, name, token_hash, token_prefix, created_at, expires_at, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [tokenId, userId, name, tokenHash, tokenPrefix, createdAt, expiration],
      );

      // Add budget scopes if specified
      for (const budgetId of budgetIds) {
        accountDb.mutate(
          `INSERT INTO api_token_budgets (token_id, file_id) VALUES (?, ?)`,
          [tokenId, budgetId],
        );
      }
    });

    return {
      id: tokenId,
      token, // Only returned on creation
      prefix: tokenPrefix,
      name,
      budgetIds,
      createdAt,
      expiresAt: expiration,
    };
  },

  /**
   * Validate an API token and return the associated user context
   * @param {string} token - The full API token
   * @returns {{ userId: string, tokenId: string, budgetIds: string[] } | null}
   */
  validateToken(token) {
    if (!token || !token.startsWith(TOKEN_PREFIX)) {
      return null;
    }

    const accountDb = getAccountDb();
    const prefix = extractPrefix(token);

    // Look up token by prefix
    const tokenRow = accountDb.first(
      `SELECT id, user_id, token_hash, expires_at, enabled
       FROM api_tokens
       WHERE token_prefix = ?`,
      [prefix],
    );

    if (!tokenRow) {
      return null;
    }

    // Verify the full token against the hash
    if (!verifyToken(token, tokenRow.token_hash)) {
      return null;
    }

    // Check if token is enabled
    if (!tokenRow.enabled) {
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (
      tokenRow.expires_at !== TOKEN_EXPIRATION_NEVER &&
      tokenRow.expires_at < now
    ) {
      return null;
    }

    // Update last used timestamp
    accountDb.mutate(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`, [
      now,
      tokenRow.id,
    ]);

    // Get budget scopes
    const budgetRows = accountDb.all(
      `SELECT file_id FROM api_token_budgets WHERE token_id = ?`,
      [tokenRow.id],
    );
    const budgetIds = budgetRows.map(row => row.file_id);

    return {
      userId: tokenRow.user_id,
      tokenId: tokenRow.id,
      budgetIds,
    };
  },

  /**
   * List all API tokens for a user (without revealing token values)
   * @param {string} userId - The user ID
   * @returns {Array<{ id: string, name: string, prefix: string, createdAt: number, lastUsedAt: number|null, expiresAt: number, enabled: boolean, budgetIds: string[] }>}
   */
  listTokens(userId) {
    const accountDb = getAccountDb();

    const tokens = accountDb.all(
      `SELECT id, name, token_prefix, created_at, last_used_at, expires_at, enabled
       FROM api_tokens
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );

    return tokens.map(token => {
      const budgetRows = accountDb.all(
        `SELECT file_id FROM api_token_budgets WHERE token_id = ?`,
        [token.id],
      );

      return {
        id: token.id,
        name: token.name,
        prefix: token.token_prefix,
        createdAt: token.created_at,
        lastUsedAt: token.last_used_at,
        expiresAt: token.expires_at,
        enabled: Boolean(token.enabled),
        budgetIds: budgetRows.map(row => row.file_id),
      };
    });
  },

  /**
   * Revoke (delete) an API token
   * @param {string} tokenId - The token ID
   * @param {string} userId - The user ID (for authorization)
   * @returns {boolean} True if the token was deleted
   */
  revokeToken(tokenId, userId) {
    const accountDb = getAccountDb();

    // Verify ownership
    const token = accountDb.first(
      `SELECT id FROM api_tokens WHERE id = ? AND user_id = ?`,
      [tokenId, userId],
    );

    if (!token) {
      return false;
    }

    accountDb.transaction(() => {
      // Delete budget scopes first (cascade should handle this, but be explicit)
      accountDb.mutate(`DELETE FROM api_token_budgets WHERE token_id = ?`, [
        tokenId,
      ]);
      accountDb.mutate(`DELETE FROM api_tokens WHERE id = ?`, [tokenId]);
    });

    return true;
  },

  /**
   * Enable or disable an API token
   * @param {string} tokenId - The token ID
   * @param {string} userId - The user ID (for authorization)
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {boolean} True if the token was updated
   */
  setTokenEnabled(tokenId, userId, enabled) {
    const accountDb = getAccountDb();

    const result = accountDb.mutate(
      `UPDATE api_tokens SET enabled = ? WHERE id = ? AND user_id = ?`,
      [enabled ? 1 : 0, tokenId, userId],
    );

    return result.changes > 0;
  },

  /**
   * Get the budget IDs that a token has access to
   * @param {string} tokenId - The token ID
   * @returns {string[]} Array of budget/file IDs (empty means all user's budgets)
   */
  getTokenBudgets(tokenId) {
    const accountDb = getAccountDb();

    const budgetRows = accountDb.all(
      `SELECT file_id FROM api_token_budgets WHERE token_id = ?`,
      [tokenId],
    );

    return budgetRows.map(row => row.file_id);
  },

  /**
   * Check if a token has access to a specific budget
   * @param {string} tokenId - The token ID
   * @param {string} budgetId - The budget/file ID to check
   * @param {string} userId - The user ID for fallback to user access
   * @returns {boolean} True if the token has access
   */
  hasAccessToBudget(tokenId, budgetId, userId) {
    const accountDb = getAccountDb();

    // Get token's budget scopes
    const budgetScopes = accountDb.all(
      `SELECT file_id FROM api_token_budgets WHERE token_id = ?`,
      [tokenId],
    );

    // If no scopes defined, check user's access instead
    if (budgetScopes.length === 0) {
      const userAccess = accountDb.first(
        `SELECT 1 FROM user_access WHERE user_id = ? AND file_id = ?`,
        [userId, budgetId],
      );
      // Also check if user is owner
      const fileOwner = accountDb.first(
        `SELECT 1 FROM files WHERE id = ? AND owner = ?`,
        [budgetId, userId],
      );
      return Boolean(userAccess || fileOwner);
    }

    // Check if budget is in token's scopes
    return budgetScopes.some(scope => scope.file_id === budgetId);
  },
};
