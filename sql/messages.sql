
CREATE TABLE messages_binary
  (timestamp TEXT,
   is_encrypted BOOLEAN,
   content bytea,
   PRIMARY KEY(timestamp, group_id));

CREATE TABLE messages_merkles
  (id TEXT PRIMAREY KEY,
   merkle TEXT);
