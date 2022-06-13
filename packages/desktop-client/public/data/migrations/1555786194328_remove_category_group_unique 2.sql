BEGIN TRANSACTION;

CREATE TEMPORARY TABLE category_groups_tmp
   (id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    is_income INTEGER DEFAULT 0,
    sort_order REAL,
    tombstone INTEGER DEFAULT 0);

INSERT INTO category_groups_tmp SELECT * FROM category_groups;

DROP TABLE category_groups;

CREATE TABLE category_groups
   (id TEXT PRIMARY KEY,
    name TEXT,
    is_income INTEGER DEFAULT 0,
    sort_order REAL,
    tombstone INTEGER DEFAULT 0);

INSERT INTO category_groups SELECT * FROM category_groups_tmp;

DROP TABLE category_groups_tmp;

COMMIT;
