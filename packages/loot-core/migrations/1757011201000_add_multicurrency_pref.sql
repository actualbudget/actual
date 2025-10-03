-- Add multi currency preference to the preferences table

INSERT OR IGNORE INTO preferences (id, value) VALUES ('enableMultiCurrency', 'false');
INSERT OR IGNORE INTO preferences (id, value) VALUES ('enableMultiCurrencyOnBudget', 'false');
