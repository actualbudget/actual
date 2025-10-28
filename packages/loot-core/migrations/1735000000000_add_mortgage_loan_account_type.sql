BEGIN TRANSACTION;

-- Add interest_rate column to accounts table for mortgage/loan accounts
ALTER TABLE accounts ADD COLUMN interest_rate REAL;

-- Add account_type column to accounts table to distinguish account types
ALTER TABLE accounts ADD COLUMN account_type TEXT DEFAULT 'checking';

COMMIT;