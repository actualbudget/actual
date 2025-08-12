-- Add a column to track where a category's automation templates come from
-- Allowed values for source (by convention): 'notes' | 'ui'
ALTER TABLE categories ADD COLUMN template_settings JSON DEFAULT '{"source": "notes"}';

UPDATE categories SET template_settings = '{"source": "ui"}' WHERE template_settings IS NULL;
