BEGIN TRANSACTION;

CREATE TABLE payee_geolocations(
  id TEXT PRIMARY KEY,
  payee_id TEXT,
  latitude REAL,
  longitude REAL,
  FOREIGN KEY (payee_id) REFERENCES payees(id)
);

COMMIT;
