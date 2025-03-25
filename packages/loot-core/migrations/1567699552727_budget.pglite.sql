-- Rewritten to be compatible with both SQLite and PostgreSQL (PGlite)

BEGIN TRANSACTION;

-- Delete records where name does not match the patterns
DELETE FROM spreadsheet_cells WHERE
  name NOT LIKE '%!budget\_%' AND
  name NOT LIKE '%!carryover\_%' AND
  name NOT LIKE '%!buffered';

-- Update the name column, replacing underscores with hyphens
UPDATE spreadsheet_cells 
SET name = REPLACE(name, '_', '-');

-- Format the name column to a specific UUID-like format for records with 'budget'
UPDATE spreadsheet_cells
SET name = 
    SUBSTR(name, 1, 28) || 
    '-' || 
    SUBSTR(name, 29, 4) || 
    '-' || 
    SUBSTR(name, 33, 4) || 
    '-' || 
    SUBSTR(name, 37, 4) || 
    '-' || 
    SUBSTR(name, 41, 12)
WHERE name LIKE '%!budget-%' AND LENGTH(name) = 52;

-- Format the name column to a specific UUID-like format for records with 'carryover'
UPDATE spreadsheet_cells
SET name = 
    SUBSTR(name, 1, 31) || 
    '-' || 
    SUBSTR(name, 32, 4) || 
    '-' || 
    SUBSTR(name, 36, 4) || 
    '-' || 
    SUBSTR(name, 40, 4) || 
    '-' || 
    SUBSTR(name, 44, 12)
WHERE name LIKE '%!carryover-%' AND LENGTH(name) = 55;

-- Update the 'expr' column for records with 'carryover' by removing the first character
UPDATE spreadsheet_cells
SET expr = SUBSTR(expr, 2)
WHERE name LIKE '%!carryover-%';

COMMIT;
