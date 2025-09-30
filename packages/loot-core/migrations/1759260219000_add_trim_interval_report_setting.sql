-- Migration: Add trim_intervals column to custom_reports table
BEGIN TRANSACTION;

ALTER TABLE custom_reports ADD COLUMN trim_intervals INTEGER DEFAULT 0;

COMMIT;
