-- accounts table

CREATE TRIGGER IF NOT EXISTS accounts_insert_pglite_sync_trigger
AFTER INSERT ON accounts
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('accounts', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS accounts_update_pglite_sync_trigger
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('accounts', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS accounts_delete_pglite_sync_trigger
AFTER DELETE ON accounts
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('accounts', 'DELETE', 'id', OLD.id);
END;

-- banks table

CREATE TRIGGER IF NOT EXISTS banks_insert_pglite_sync_trigger
AFTER INSERT ON banks
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('banks', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS banks_update_pglite_sync_trigger
AFTER UPDATE ON banks
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('banks', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS banks_delete_pglite_sync_trigger
AFTER DELETE ON banks
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('banks', 'DELETE', 'id', OLD.id);
END;

-- category_groups table

CREATE TRIGGER IF NOT EXISTS category_groups_insert_pglite_sync_trigger
AFTER INSERT ON category_groups
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_groups', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS category_groups_update_pglite_sync_trigger
AFTER UPDATE ON category_groups
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_groups', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS category_groups_delete_pglite_sync_trigger
AFTER DELETE ON category_groups
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_groups', 'DELETE', 'id', OLD.id);
END;

-- categories table

CREATE TRIGGER IF NOT EXISTS categories_insert_pglite_sync_trigger
AFTER INSERT ON categories
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('categories', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS categories_update_pglite_sync_trigger
AFTER UPDATE ON categories
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('categories', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS categories_delete_pglite_sync_trigger
AFTER DELETE ON categories
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('categories', 'DELETE', 'id', OLD.id);
END;

-- category_mapping table

CREATE TRIGGER IF NOT EXISTS category_mapping_insert_pglite_sync_trigger
AFTER INSERT ON category_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_mapping', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS category_mapping_update_pglite_sync_trigger
AFTER UPDATE ON category_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_mapping', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS category_mapping_delete_pglite_sync_trigger
AFTER DELETE ON category_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_mapping', 'DELETE', 'id', OLD.id);
END;

-- payees table

CREATE TRIGGER IF NOT EXISTS payees_insert_pglite_sync_trigger
AFTER INSERT ON payees
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payees', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS payees_update_pglite_sync_trigger
AFTER UPDATE ON payees
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payees', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS payees_delete_pglite_sync_trigger
AFTER DELETE ON payees
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payees', 'DELETE', 'id', OLD.id);
END;

-- payee_mapping table

CREATE TRIGGER IF NOT EXISTS payee_mapping_insert_pglite_sync_trigger
AFTER INSERT ON payee_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payee_mapping', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS payee_mapping_update_pglite_sync_trigger
AFTER UPDATE ON payee_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payee_mapping', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS payee_mapping_delete_pglite_sync_trigger
AFTER DELETE ON payee_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payee_mapping', 'DELETE', 'id', OLD.id);
END;

-- messages_clock table

CREATE TRIGGER IF NOT EXISTS messages_clock_insert_pglite_sync_trigger
AFTER INSERT ON messages_clock
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_clock', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS messages_clock_update_pglite_sync_trigger
AFTER UPDATE ON messages_clock
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_clock', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS messages_clock_delete_pglite_sync_trigger
AFTER DELETE ON messages_clock
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_clock', 'DELETE', 'id', OLD.id);
END;

-- messages_crdt table

CREATE TRIGGER IF NOT EXISTS messages_crdt_insert_pglite_sync_trigger
AFTER INSERT ON messages_crdt
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_crdt', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS messages_crdt_update_pglite_sync_trigger
AFTER UPDATE ON messages_crdt
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_crdt', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS messages_crdt_delete_pglite_sync_trigger
AFTER DELETE ON messages_crdt
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_crdt', 'DELETE', 'id', OLD.id);
END;

-- notes table

CREATE TRIGGER IF NOT EXISTS notes_insert_pglite_sync_trigger
AFTER INSERT ON notes
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('notes', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS notes_update_pglite_sync_trigger
AFTER UPDATE ON notes
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('notes', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS notes_delete_pglite_sync_trigger
AFTER DELETE ON notes
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('notes', 'DELETE', 'id', OLD.id);
END;

-- rules table

CREATE TRIGGER IF NOT EXISTS rules_insert_pglite_sync_trigger
AFTER INSERT ON rules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('rules', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS rules_update_pglite_sync_trigger
AFTER UPDATE ON rules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('rules', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS rules_delete_pglite_sync_trigger
AFTER DELETE ON rules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('rules', 'DELETE', 'id', OLD.id);
END;

-- schedules table

CREATE TRIGGER IF NOT EXISTS schedules_insert_pglite_sync_trigger
AFTER INSERT ON schedules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS schedules_update_pglite_sync_trigger
AFTER UPDATE ON schedules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS schedules_delete_pglite_sync_trigger
AFTER DELETE ON schedules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules', 'DELETE', 'id', OLD.id);
END;

-- schedules_json_paths table

CREATE TRIGGER IF NOT EXISTS schedules_json_paths_insert_pglite_sync_trigger
AFTER INSERT ON schedules_json_paths
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_json_paths', 'INSERT', 'schedule_id', NEW.schedule_id);
END;

CREATE TRIGGER IF NOT EXISTS schedules_json_paths_update_pglite_sync_trigger
AFTER UPDATE ON schedules_json_paths
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_json_paths', 'UPDATE', 'schedule_id', NEW.schedule_id);
END;

CREATE TRIGGER IF NOT EXISTS schedules_json_paths_delete_pglite_sync_trigger
AFTER DELETE ON schedules_json_paths
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_json_paths', 'DELETE', 'schedule_id', OLD.schedule_id);
END;

-- schedules_next_date table

CREATE TRIGGER IF NOT EXISTS schedules_next_date_insert_pglite_sync_trigger
AFTER INSERT ON schedules_next_date
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_next_date', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS schedules_next_date_update_pglite_sync_trigger
AFTER UPDATE ON schedules_next_date
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_next_date', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS schedules_next_date_delete_pglite_sync_trigger
AFTER DELETE ON schedules_next_date
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_next_date', 'DELETE', 'id', OLD.id);
END;

-- transactions table

CREATE TRIGGER IF NOT EXISTS transactions_insert_pglite_sync_trigger
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transactions', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS transactions_update_pglite_sync_trigger
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transactions', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS transactions_delete_pglite_sync_trigger
AFTER DELETE ON transactions
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transactions', 'DELETE', 'id', OLD.id);
END;

-- reflect_budgets table

CREATE TRIGGER IF NOT EXISTS reflect_budgets_insert_pglite_sync_trigger
AFTER INSERT ON reflect_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('reflect_budgets', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS reflect_budgets_update_pglite_sync_trigger
AFTER UPDATE ON reflect_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('reflect_budgets', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS reflect_budgets_delete_pglite_sync_trigger
AFTER DELETE ON reflect_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('reflect_budgets', 'DELETE', 'id', OLD.id);
END;

-- zero_budgets table

CREATE TRIGGER IF NOT EXISTS zero_budgets_insert_pglite_sync_trigger
AFTER INSERT ON zero_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budgets', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS zero_budgets_update_pglite_sync_trigger
AFTER UPDATE ON zero_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budgets', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS zero_budgets_delete_pglite_sync_trigger
AFTER DELETE ON zero_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budgets', 'DELETE', 'id', OLD.id);
END;

-- zero_budget_months table

CREATE TRIGGER IF NOT EXISTS zero_budget_months_insert_pglite_sync_trigger
AFTER INSERT ON zero_budget_months
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budget_months', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS zero_budget_months_update_pglite_sync_trigger
AFTER UPDATE ON zero_budget_months
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budget_months', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS zero_budget_months_delete_pglite_sync_trigger
AFTER DELETE ON zero_budget_months
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budget_months', 'DELETE', 'id', OLD.id);
END;

-- transaction_filters table

CREATE TRIGGER IF NOT EXISTS transaction_filters_insert_pglite_sync_trigger
AFTER INSERT ON transaction_filters
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transaction_filters', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS transaction_filters_update_pglite_sync_trigger
AFTER UPDATE ON transaction_filters
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transaction_filters', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS transaction_filters_delete_pglite_sync_trigger
AFTER DELETE ON transaction_filters
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transaction_filters', 'DELETE', 'id', OLD.id);
END;

-- preferences table

CREATE TRIGGER IF NOT EXISTS preferences_insert_pglite_sync_trigger
AFTER INSERT ON preferences
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('preferences', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS preferences_update_pglite_sync_trigger
AFTER UPDATE ON preferences
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('preferences', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS preferences_delete_pglite_sync_trigger
AFTER DELETE ON preferences
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('preferences', 'DELETE', 'id', OLD.id);
END;

-- custom_reports table

CREATE TRIGGER IF NOT EXISTS custom_reports_insert_pglite_sync_trigger
AFTER INSERT ON custom_reports
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('custom_reports', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS custom_reports_update_pglite_sync_trigger
AFTER UPDATE ON custom_reports
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('custom_reports', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS custom_reports_delete_pglite_sync_trigger
AFTER DELETE ON custom_reports
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('custom_reports', 'DELETE', 'id', OLD.id);
END;

-- dashboard table

CREATE TRIGGER IF NOT EXISTS dashboard_insert_pglite_sync_trigger
AFTER INSERT ON dashboard
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('dashboard', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS dashboard_update_pglite_sync_trigger
AFTER UPDATE ON dashboard
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('dashboard', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS dashboard_delete_pglite_sync_trigger
AFTER DELETE ON dashboard
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('dashboard', 'DELETE', 'id', OLD.id);
END;

-- kvcache table

CREATE TRIGGER IF NOT EXISTS kvcache_insert_pglite_sync_trigger
AFTER INSERT ON kvcache
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache', 'INSERT', 'key', NEW.key);
END;

CREATE TRIGGER IF NOT EXISTS kvcache_update_pglite_sync_trigger
AFTER UPDATE ON kvcache
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache', 'UPDATE', 'key', NEW.key);
END;

CREATE TRIGGER IF NOT EXISTS kvcache_delete_pglite_sync_trigger
AFTER DELETE ON kvcache
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache', 'DELETE', 'key', OLD.key);
END;

-- kvcache_key table

CREATE TRIGGER IF NOT EXISTS kvcache_key_insert_pglite_sync_trigger
AFTER INSERT ON kvcache_key
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache_key', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS kvcache_key_update_pglite_sync_trigger
AFTER UPDATE ON kvcache_key
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache_key', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS kvcache_key_delete_pglite_sync_trigger
AFTER DELETE ON kvcache_key
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache_key', 'DELETE', 'id', OLD.id);
END;