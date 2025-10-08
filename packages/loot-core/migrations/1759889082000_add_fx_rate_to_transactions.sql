BEGIN TRANSACTION;

-- Add base_amount column to transactions table for multi-currency support
-- base_amount stores the transaction amount converted to the base currency
-- For transactions in the base currency, base_amount is NULL (use amount)
-- For foreign currency transactions, this field stores the converted value in base currency
-- This allows budget calculations to work consistently across all currencies
ALTER TABLE transactions ADD COLUMN base_amount INTEGER;

-- Add fx_rate column to transactions table for cross-currency transfers
-- fx_rate stores the exchange rate used for the conversion
-- For transfers between accounts with different currencies, this stores the rate
-- The transfer partner transaction will have the inverse rate (1/fx_rate)
ALTER TABLE transactions ADD COLUMN fx_rate REAL;

COMMIT;
