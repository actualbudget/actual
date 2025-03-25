BEGIN TRANSACTION;

CREATE TABLE schedules
  (id VARCHAR(36) PRIMARY KEY,
   rule VARCHAR(36),
   active BOOLEAN DEFAULT FALSE,
   completed BOOLEAN DEFAULT FALSE,
   posts_transaction BOOLEAN DEFAULT FALSE,
   tombstone BOOLEAN DEFAULT FALSE);

CREATE TABLE schedules_next_date
  (id VARCHAR(36) PRIMARY KEY,
   schedule_id VARCHAR(36),
   local_next_date DATE,
   local_next_date_ts BIGINT,
   base_next_date DATE,
   base_next_date_ts BIGINT);

CREATE TABLE schedules_json_paths
  (schedule_id VARCHAR(36) PRIMARY KEY,
   payee TEXT,
   account TEXT,
   amount TEXT,
   date TEXT);

ALTER TABLE transactions ADD COLUMN schedule VARCHAR(36);

COMMIT;
