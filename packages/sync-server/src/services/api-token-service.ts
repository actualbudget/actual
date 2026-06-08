import crypto from 'crypto';

import { v4 as uuidv4 } from 'uuid';

import { getAccountDb } from '#account-db';
import { TOKEN_EXPIRATION_NEVER } from '#util/validate-user';

// ============================================
// Database Row Types (internal use)
// ============================================

/** Raw row from api_tokens table */
type ApiTokenRow = {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  created_at: number;
  last_used_at: number | null;
  expires_at: number;
  enabled: number; // SQLite stores booleans as 0/1
};

/** Raw row from api_token_budgets table */
type ApiTokenBudgetRow = {
  token_id: string;
  file_id: string;
};

/** Database wrapper type */
type WrappedDatabase = {
  all<T = unknown>(sql: string, params?: unknown[]): T[];
  first<T = unknown>(sql: string, params?: unknown[]): T | null;
  mutate(
    sql: string,
    params?: unknown[],
  ): { changes: number; insertId: number | bigint };
  transaction<T>(fn: () => T): T;
};

// ============================================
// Public API Types (exported)
// ============================================

/** Result returned when creating a new token */
export type CreateTokenResult = {
  id: string;
  token: string; // Only exposed at creation time
  prefix: string;
  name: string;
  budgetIds: string[];
  createdAt: number;
  expiresAt: number;
};

/** Result returned when validating a token successfully */
export type ValidateTokenResult = {
  userId: string;
  tokenId: string;
  budgetIds: string[];
};

/** Token information returned when listing tokens */
export type TokenListItem = {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
  expiresAt: number;
  enabled: boolean;
  budgetIds: string[];
};

/** API Token Service interface */
export type ApiTokenService = {
  createToken(
    userId: string,
    name: string,
    budgetIds?: string[],
    expiresAt?: number | null,
  ): Promise<CreateTokenResult>;
  validateToken(token: string): Promise<ValidateTokenResult | null>;
  listTokens(userId: string): TokenListItem[];
  revokeToken(tokenId: string, userId: string): boolean;
  setTokenEnabled(tokenId: string, userId: string, enabled: boolean): boolean;
  getTokenBudgets(tokenId: string): string[];
};

// ============================================
// Constants
// ============================================

export const TOKEN_PREFIX = 'act_' as const;
const TOKEN_LENGTH = 32 as const;
// base64 produces 4 chars per 3 bytes, then ~3% are filtered out as non-alphanumeric
// 32 chars * (3 bytes / 4 chars) * 1.34 safety margin = 32 bytes → 43 base64 chars → <1e-8 failure rate
const TOKEN_RANDOM_BYTES = Math.ceil(((TOKEN_LENGTH * 3) / 4) * 1.34);

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a secure random API token
 * Format: act_<32 random chars>
 */
function generateToken(): string {
  let randomPart = '';

  // Loop until we have enough alphanumeric characters (extremely rare to need multiple iterations)
  while (randomPart.length < TOKEN_LENGTH) {
    const bytes = crypto.randomBytes(TOKEN_RANDOM_BYTES);
    randomPart += bytes.toString('base64url').replace(/[^a-zA-Z0-9]/g, '');
  }

  return `${TOKEN_PREFIX}${randomPart.slice(0, TOKEN_LENGTH)}`;
}

/**
 * Extract the prefix portion of a token for lookup
 * @param token - The full token
 * @returns The prefix (first 12 chars: "act_" + 8 chars)
 */
function extractPrefix(token: string): string {
  return token.slice(0, 12);
}

/**
 * Hash a token with SHA-256.
 *
 * API tokens are high-entropy random secrets (act_ + 32 random chars, ~190
 * bits), so a slow password KDF like bcrypt adds no brute-force resistance and
 * only taxes every request. A fast cryptographic hash is the standard approach
 * for API tokens: a DB leak exposes only the SHA-256 of an unguessable secret,
 * which is neither reversible nor brute-forceable. The deterministic hash also
 * lets us look tokens up by an indexed `token_hash` column directly.
 * @param token - The token to hash
 * @returns The hex-encoded SHA-256 hash
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================
// Service Implementation
// ============================================

export const apiTokenService: ApiTokenService = {
  /**
   * Create a new API token for a user
   * @param userId - The user ID
   * @param name - A friendly name for the token
   * @param budgetIds - Array of budget/file IDs to scope the token to (empty = no access)
   * @param expiresAt - Unix timestamp for expiration, or null for never
   */
  async createToken(
    userId: string,
    name: string,
    budgetIds: string[] = [],
    expiresAt: number | null = null,
  ): Promise<CreateTokenResult> {
    const accountDb: WrappedDatabase = getAccountDb();
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
   * @param token - The full API token
   */
  async validateToken(token: string): Promise<ValidateTokenResult | null> {
    if (!token || !token.startsWith(TOKEN_PREFIX)) {
      return null;
    }

    const accountDb: WrappedDatabase = getAccountDb();
    const tokenHash = hashToken(token);

    // Direct lookup by the indexed (unique) token_hash. The join on users
    // (enabled = 1) ensures tokens owned by a disabled user are rejected,
    // matching the password auth path (getSession).
    const tokenRow = accountDb.first<ApiTokenRow>(
      `SELECT api_tokens.id, api_tokens.user_id,
              api_tokens.expires_at, api_tokens.enabled, api_tokens.last_used_at
       FROM api_tokens
       JOIN users ON users.id = api_tokens.user_id
       WHERE api_tokens.token_hash = ? AND users.enabled = 1`,
      [tokenHash],
    );

    if (!tokenRow) {
      return null;
    }

    // Check if the token itself is enabled
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

    // Update last used timestamp (throttled to reduce write load)
    const shouldUpdateLastUsed =
      !tokenRow.last_used_at || now - tokenRow.last_used_at > 60;
    if (shouldUpdateLastUsed) {
      accountDb.mutate(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`, [
        now,
        tokenRow.id,
      ]);
    }

    // Get budget scopes
    const budgetRows = accountDb.all<ApiTokenBudgetRow>(
      `SELECT file_id FROM api_token_budgets WHERE token_id = ?`,
      [tokenRow.id],
    );

    return {
      userId: tokenRow.user_id,
      tokenId: tokenRow.id,
      budgetIds: budgetRows.map(row => row.file_id),
    };
  },

  /**
   * List all API tokens for a user (without revealing token values)
   * @param userId - The user ID
   */
  listTokens(userId: string): TokenListItem[] {
    const accountDb: WrappedDatabase = getAccountDb();

    const tokens = accountDb.all<ApiTokenRow>(
      `SELECT id, name, token_prefix, created_at, last_used_at, expires_at, enabled
       FROM api_tokens
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );

    // Early return if no tokens
    if (tokens.length === 0) {
      return [];
    }

    // Fetch all budgets for all tokens in a single query (avoids N+1)
    const tokenIds = tokens.map(t => t.id);
    const placeholders = tokenIds.map(() => '?').join(',');
    const allBudgets = accountDb.all<ApiTokenBudgetRow>(
      `SELECT token_id, file_id FROM api_token_budgets WHERE token_id IN (${placeholders})`,
      tokenIds,
    );

    // Build a lookup map: token_id -> array of file_ids
    const budgetsByToken = new Map<string, string[]>();
    for (const budget of allBudgets) {
      const existing = budgetsByToken.get(budget.token_id) || [];
      existing.push(budget.file_id);
      budgetsByToken.set(budget.token_id, existing);
    }

    return tokens.map(token => ({
      id: token.id,
      name: token.name,
      prefix: token.token_prefix,
      createdAt: token.created_at,
      lastUsedAt: token.last_used_at,
      expiresAt: token.expires_at,
      enabled: Boolean(token.enabled),
      budgetIds: budgetsByToken.get(token.id) || [],
    }));
  },

  /**
   * Revoke (delete) an API token
   * @param tokenId - The token ID
   * @param userId - The user ID (for authorization)
   * @returns True if the token was deleted
   */
  revokeToken(tokenId: string, userId: string): boolean {
    const accountDb: WrappedDatabase = getAccountDb();

    // Verify ownership
    const token = accountDb.first<{ id: string }>(
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
   * @param tokenId - The token ID
   * @param userId - The user ID (for authorization)
   * @param enabled - Whether to enable or disable
   * @returns True if the token was updated
   */
  setTokenEnabled(tokenId: string, userId: string, enabled: boolean): boolean {
    const accountDb: WrappedDatabase = getAccountDb();

    const result = accountDb.mutate(
      `UPDATE api_tokens SET enabled = ? WHERE id = ? AND user_id = ?`,
      [enabled ? 1 : 0, tokenId, userId],
    );

    return result.changes > 0;
  },

  /**
   * Get the budget IDs that a token has access to
   * @param tokenId - The token ID
   * @returns Array of budget/file IDs (empty means all user's budgets)
   */
  getTokenBudgets(tokenId: string): string[] {
    const accountDb: WrappedDatabase = getAccountDb();

    const budgetRows = accountDb.all<ApiTokenBudgetRow>(
      `SELECT file_id FROM api_token_budgets WHERE token_id = ?`,
      [tokenId],
    );

    return budgetRows.map(row => row.file_id);
  },
};
