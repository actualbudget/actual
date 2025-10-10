-- Migration: Add isGlobal column to preferences table
BEGIN TRANSACTION;

ALTER TABLE preferences ADD COLUMN isGlobal INTEGER DEFAULT 0;

COMMIT;


