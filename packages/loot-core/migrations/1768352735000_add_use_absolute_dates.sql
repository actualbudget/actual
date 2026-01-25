-- Migration: Add use_absolute_dates column to custom_reports table
BEGIN TRANSACTION;

ALTER TABLE custom_reports ADD COLUMN use_absolute_dates INTEGER DEFAULT 0;

COMMIT;

