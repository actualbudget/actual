BEGIN TRANSACTION;

ALTER TABLE tags ADD COLUMN tombstone integer DEFAULT 0;
INSERT INTO tags (id, tag) VALUES ('default-tag', '*');

COMMIT;
