-- Add a column to track where a category's automation templates come from
-- Allowed values (by convention): 'notes' | 'ui'
ALTER TABLE categories ADD COLUMN template_source TEXT DEFAULT 'notes';
