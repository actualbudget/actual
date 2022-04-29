PRAGMA foreign_keys = OFF;

ALTER TABLE poop RENAME TO tmp_poop;

CREATE TABLE poop
  (id INT PRIMARY KEY,
   name TEXT,
   is_expense INTEGER);

INSERT INTO poop
SELECT id, name, is_expense FROM tmp_poop;

DROP TABLE tmp_poop;

PRAGMA foreign_keys = ON;
