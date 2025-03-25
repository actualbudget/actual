BEGIN TRANSACTION;

CREATE TEMPORARY TABLE category_groups_tmp
   (id VARCHAR(36) PRIMARY KEY,
    name TEXT UNIQUE,
    is_income BOOLEAN DEFAULT FALSE,
    sort_order BIGINT,
    tombstone BOOLEAN DEFAULT FALSE);

INSERT INTO category_groups_tmp SELECT * FROM category_groups;

DROP TABLE category_groups;

CREATE TABLE category_groups
   (id VARCHAR(36) PRIMARY KEY,
    name TEXT,
    is_income BOOLEAN DEFAULT FALSE,
    sort_order BIGINT,
    tombstone BOOLEAN DEFAULT FALSE);

INSERT INTO category_groups SELECT * FROM category_groups_tmp;

DROP TABLE category_groups_tmp;

COMMIT;
