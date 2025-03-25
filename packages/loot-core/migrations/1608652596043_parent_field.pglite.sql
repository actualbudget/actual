BEGIN TRANSACTION;

-- Add the parent_id column to the transactions table
ALTER TABLE transactions ADD COLUMN parent_id VARCHAR(36);

-- Update parent_id column based on condition
UPDATE transactions
SET parent_id = CASE
  WHEN isChild THEN
    CASE 
      WHEN POSITION('/' IN id) > 0 THEN SUBSTRING(id FROM 1 FOR POSITION('/' IN id) - 1)
      ELSE id
    END
  ELSE NULL
END;

-- Create an index on the parent_id column
CREATE INDEX trans_parent_id ON transactions(parent_id);

COMMIT;
