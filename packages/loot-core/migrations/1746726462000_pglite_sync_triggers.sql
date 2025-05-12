BEGIN TRANSACTION;

-- banks table

CREATE TRIGGER banks_after_insert_pglite_sync
AFTER INSERT ON banks
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('banks', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER banks_after_update_pglite_sync
AFTER UPDATE ON banks
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('banks', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER banks_after_delete_pglite_sync
AFTER DELETE ON banks
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('banks', 'DELETE', 'id', OLD.id);
END;

-- accounts table

CREATE TRIGGER accounts_after_insert_pglite_sync
AFTER INSERT ON accounts
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('accounts', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER accounts_after_update_pglite_sync
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('accounts', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER accounts_after_delete_pglite_sync
AFTER DELETE ON accounts
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('accounts', 'DELETE', 'id', OLD.id);
END;

-- category_groups table

CREATE TRIGGER category_groups_after_insert_pglite_sync
AFTER INSERT ON category_groups
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_groups', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER category_groups_after_update_pglite_sync
AFTER UPDATE ON category_groups
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_groups', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER category_groups_after_delete_pglite_sync
AFTER DELETE ON category_groups
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_groups', 'DELETE', 'id', OLD.id);
END;

-- categories table

CREATE TRIGGER categories_after_insert_pglite_sync
AFTER INSERT ON categories
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('categories', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER categories_after_update_pglite_sync
AFTER UPDATE ON categories
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('categories', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER categories_after_delete_pglite_sync
AFTER DELETE ON categories
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('categories', 'DELETE', 'id', OLD.id);
END;

-- category_mapping table

CREATE TRIGGER category_mapping_after_insert_pglite_sync
AFTER INSERT ON category_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_mapping', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER category_mapping_after_update_pglite_sync
AFTER UPDATE ON category_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_mapping', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER category_mapping_after_delete_pglite_sync
AFTER DELETE ON category_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('category_mapping', 'DELETE', 'id', OLD.id);
END;

-- kvcache table

CREATE TRIGGER kvcache_after_insert_pglite_sync
AFTER INSERT ON kvcache
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache', 'INSERT', 'key', NEW.key);
END;

CREATE TRIGGER kvcache_after_update_pglite_sync
AFTER UPDATE ON kvcache
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache', 'UPDATE', 'key', NEW.key);
END;

CREATE TRIGGER kvcache_after_delete_pglite_sync
AFTER DELETE ON kvcache
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache', 'DELETE', 'key', OLD.key);
END;

-- kvcache_key table

CREATE TRIGGER kvcache_key_after_insert_pglite_sync
AFTER INSERT ON kvcache_key
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache_key', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER kvcache_key_after_update_pglite_sync
AFTER UPDATE ON kvcache_key
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache_key', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER kvcache_key_after_delete_pglite_sync
AFTER DELETE ON kvcache_key
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('kvcache_key', 'DELETE', 'id', OLD.id);
END;

-- messages_clock table

CREATE TRIGGER messages_clock_after_insert_pglite_sync
AFTER INSERT ON messages_clock
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_clock', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER messages_clock_after_update_pglite_sync
AFTER UPDATE ON messages_clock
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_clock', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER messages_clock_after_delete_pglite_sync
AFTER DELETE ON messages_clock
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_clock', 'DELETE', 'id', OLD.id);
END;

-- messages_crdt table

CREATE TRIGGER messages_crdt_after_insert_pglite_sync
AFTER INSERT ON messages_crdt
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_crdt', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER messages_crdt_after_update_pglite_sync
AFTER UPDATE ON messages_crdt
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_crdt', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER messages_crdt_after_delete_pglite_sync
AFTER DELETE ON messages_crdt
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('messages_crdt', 'DELETE', 'id', OLD.id);
END;

-- notes table

CREATE TRIGGER notes_after_insert_pglite_sync
AFTER INSERT ON notes
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('notes', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER notes_after_update_pglite_sync
AFTER UPDATE ON notes
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('notes', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER notes_after_delete_pglite_sync
AFTER DELETE ON notes
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('notes', 'DELETE', 'id', OLD.id);
END;

-- payees table

CREATE TRIGGER payees_after_insert_pglite_sync
AFTER INSERT ON payees
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payees', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER payees_after_update_pglite_sync
AFTER UPDATE ON payees
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payees', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER payees_after_delete_pglite_sync
AFTER DELETE ON payees
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payees', 'DELETE', 'id', OLD.id);
END;

-- payee_mapping table

CREATE TRIGGER payee_mapping_after_insert_pglite_sync
AFTER INSERT ON payee_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payee_mapping', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER payee_mapping_after_update_pglite_sync
AFTER UPDATE ON payee_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payee_mapping', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER payee_mapping_after_delete_pglite_sync
AFTER DELETE ON payee_mapping
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('payee_mapping', 'DELETE', 'id', OLD.id);
END;

-- rules table

CREATE TRIGGER rules_after_insert_pglite_sync
AFTER INSERT ON rules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('rules', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER rules_after_update_pglite_sync
AFTER UPDATE ON rules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('rules', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER rules_after_delete_pglite_sync
AFTER DELETE ON rules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('rules', 'DELETE', 'id', OLD.id);
END;

-- schedules table

CREATE TRIGGER schedules_after_insert_pglite_sync
AFTER INSERT ON schedules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER schedules_after_update_pglite_sync
AFTER UPDATE ON schedules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER schedules_after_delete_pglite_sync
AFTER DELETE ON schedules
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules', 'DELETE', 'id', OLD.id);
END;

-- schedules_json_paths table

CREATE TRIGGER schedules_json_paths_after_insert_pglite_sync
AFTER INSERT ON schedules_json_paths
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_json_paths', 'INSERT', 'schedule_id', NEW.schedule_id);
END;

CREATE TRIGGER schedules_json_paths_after_update_pglite_sync
AFTER UPDATE ON schedules_json_paths
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_json_paths', 'UPDATE', 'schedule_id', NEW.schedule_id);
END;

CREATE TRIGGER schedules_json_paths_after_delete_pglite_sync
AFTER DELETE ON schedules_json_paths
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_json_paths', 'DELETE', 'schedule_id', OLD.schedule_id);
END;

-- schedules_next_date table

CREATE TRIGGER schedules_next_date_after_insert_pglite_sync
AFTER INSERT ON schedules_next_date
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_next_date', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER schedules_next_date_after_update_pglite_sync
AFTER UPDATE ON schedules_next_date
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_next_date', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER schedules_next_date_after_delete_pglite_sync
AFTER DELETE ON schedules_next_date
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('schedules_next_date', 'DELETE', 'id', OLD.id);
END;

-- transactions table

CREATE TRIGGER transactions_after_insert_pglite_sync
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transactions', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER transactions_after_update_pglite_sync
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transactions', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER transactions_after_delete_pglite_sync
AFTER DELETE ON transactions
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transactions', 'DELETE', 'id', OLD.id);
END;

-- reflect_budgets table

CREATE TRIGGER reflect_budgets_after_insert_pglite_sync
AFTER INSERT ON reflect_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('reflect_budgets', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER reflect_budgets_after_update_pglite_sync
AFTER UPDATE ON reflect_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('reflect_budgets', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER reflect_budgets_after_delete_pglite_sync
AFTER DELETE ON reflect_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('reflect_budgets', 'DELETE', 'id', OLD.id);
END;

-- zero_budgets table

CREATE TRIGGER zero_budgets_after_insert_pglite_sync
AFTER INSERT ON zero_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budgets', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER zero_budgets_after_update_pglite_sync
AFTER UPDATE ON zero_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budgets', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER zero_budgets_after_delete_pglite_sync
AFTER DELETE ON zero_budgets
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budgets', 'DELETE', 'id', OLD.id);
END;

-- zero_budget_months table

CREATE TRIGGER zero_budget_months_after_insert_pglite_sync
AFTER INSERT ON zero_budget_months
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budget_months', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER zero_budget_months_after_update_pglite_sync
AFTER UPDATE ON zero_budget_months
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budget_months', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER zero_budget_months_after_delete_pglite_sync
AFTER DELETE ON zero_budget_months
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('zero_budget_months', 'DELETE', 'id', OLD.id);
END;

-- transaction_filters table

CREATE TRIGGER transaction_filters_after_insert_pglite_sync
AFTER INSERT ON transaction_filters
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transaction_filters', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER transaction_filters_after_update_pglite_sync
AFTER UPDATE ON transaction_filters
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transaction_filters', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER transaction_filters_after_delete_pglite_sync
AFTER DELETE ON transaction_filters
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('transaction_filters', 'DELETE', 'id', OLD.id);
END;

-- preferences table

CREATE TRIGGER preferences_after_insert_pglite_sync
AFTER INSERT ON preferences
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('preferences', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER preferences_after_update_pglite_sync
AFTER UPDATE ON preferences
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('preferences', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER preferences_after_delete_pglite_sync
AFTER DELETE ON preferences
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('preferences', 'DELETE', 'id', OLD.id);
END;

-- custom_reports table

CREATE TRIGGER custom_reports_after_insert_pglite_sync
AFTER INSERT ON custom_reports
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('custom_reports', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER custom_reports_after_update_pglite_sync
AFTER UPDATE ON custom_reports
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('custom_reports', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER custom_reports_after_delete_pglite_sync
AFTER DELETE ON custom_reports
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('custom_reports', 'DELETE', 'id', OLD.id);
END;

-- dashboard table

CREATE TRIGGER dashboard_after_insert_pglite_sync
AFTER INSERT ON dashboard
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('dashboard', 'INSERT', 'id', NEW.id);
END;

CREATE TRIGGER dashboard_after_update_pglite_sync
AFTER UPDATE ON dashboard
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('dashboard', 'UPDATE', 'id', NEW.id);
END;

CREATE TRIGGER dashboard_after_delete_pglite_sync
AFTER DELETE ON dashboard
FOR EACH ROW
BEGIN
  SELECT PGLITE_SYNC('dashboard', 'DELETE', 'id', OLD.id);
END;

COMMIT;
