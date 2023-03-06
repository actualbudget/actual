
CREATE TABLE auth
  (password TEXT PRIMARY KEY);

CREATE TABLE sessions
  (token TEXT PRIMARY KEY);

CREATE TABLE files
  (id TEXT PRIMARY KEY,
   group_id TEXT,
   sync_version SMALLINT,
   encrypt_meta TEXT,
   encrypt_keyid TEXT,
   encrypt_salt TEXT,
   encrypt_test TEXT,
   deleted BOOLEAN DEFAULT FALSE,
   name TEXT);
