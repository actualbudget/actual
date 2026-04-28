import { getAccountDb } from '../src/account-db';

export const up = async function () {
  const accountDb = getAccountDb();

  accountDb.transaction(() => {
    accountDb.exec(
      `
      CREATE TABLE api_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        token_prefix TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER,
        expires_at INTEGER NOT NULL,
        enabled INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE api_token_budgets (
        token_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        PRIMARY KEY (token_id, file_id),
        FOREIGN KEY (token_id) REFERENCES api_tokens(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);
      CREATE INDEX idx_api_tokens_prefix ON api_tokens(token_prefix);
      CREATE INDEX idx_api_token_budgets_token_id ON api_token_budgets(token_id);
      `,
    );
  });
};

export const down = async function () {
  const accountDb = getAccountDb();

  accountDb.transaction(() => {
    accountDb.exec(
      `
      DROP INDEX IF EXISTS idx_api_token_budgets_token_id;
      DROP INDEX IF EXISTS idx_api_tokens_prefix;
      DROP INDEX IF EXISTS idx_api_tokens_user_id;
      DROP TABLE IF EXISTS api_token_budgets;
      DROP TABLE IF EXISTS api_tokens;
      `,
    );
  });
};
