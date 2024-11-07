BEGIN TRANSACTION;

CREATE INDEX trans_category_date ON transactions(category, date);
CREATE INDEX trans_category ON transactions(category);
CREATE INDEX trans_date ON transactions(date);

COMMIT;
