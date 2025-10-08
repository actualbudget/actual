-- Migration: Add currency_code column to accounts table
BEGIN TRANSACTION;

ALTER TABLE accounts ADD COLUMN currency_code TEXT;

COMMIT;
