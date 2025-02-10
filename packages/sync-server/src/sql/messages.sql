
CREATE TABLE messages_binary
  (timestamp TEXT PRIMARY KEY,
   is_encrypted BOOLEAN,
   content bytea);

CREATE TABLE messages_merkles
  (id INTEGER PRIMARY KEY,
   merkle TEXT);
