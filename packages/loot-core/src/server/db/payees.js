import { batchMessages } from '../sync';
import { payeeModel, payeeRuleModel } from '../models';
import { groupById } from '../../shared/util';
import { all, delete_, first, insert, insertWithUUID, update } from './db-actions';

export { toDateRepr, fromDateRepr } from '../models';

export async function getPayee(id) {
  return first(`SELECT * FROM payees WHERE id = ?`, [id]);
}

export async function insertPayee(payee) {
  payee = payeeModel.validate(payee);
  let id;
  await batchMessages(async () => {
    id = await insertWithUUID('payees', payee);
    await insert('payee_mapping', { id, targetId: id });
  });
  return id;
}

export async function deletePayee(payee) {
  const { transfer_acct } = await first('SELECT * FROM payees WHERE id = ?', [
    payee.id
  ]);
  if (transfer_acct) {
    // You should never be able to delete transfer payees
    return;
  }

  // let mappings = await all('SELECT id FROM payee_mapping WHERE targetId = ?', [
  //   payee.id
  // ]);
  // await Promise.all(
  //   mappings.map(m => update('payee_mapping', { id: m.id, targetId: null }))
  // );

  const rules = await all('SELECT * FROM payee_rules WHERE payee_id = ?', [
    payee.id
  ]);
  await Promise.all(rules.map(rule => deletePayeeRule({ id: rule.id })));
  return delete_('payees', payee.id);
}

export async function deleteTransferPayee(payee) {
  // This allows deleting transfer payees
  return delete_('payees', payee.id);
}

export function updatePayee(payee) {
  payee = payeeModel.validate(payee, { update: true });
  return update('payees', payee);
}

export async function mergePayees(target, ids) {
  // Load in payees so we can check some stuff
  const payees = groupById(await all('SELECT * FROM payees'));

  // Filter out any transfer payees
  if (payees[target].transfer_acct != null) {
    return;
  }
  ids = ids.filter(id => payees[id].transfer_acct == null);

  await batchMessages(async () => {
    await Promise.all(
      ids.map(async id => {
        const mappings = await all(
          'SELECT id FROM payee_mapping WHERE targetId = ?',
          [id]
        );
        await Promise.all(
          mappings.map(m =>
            update('payee_mapping', { id: m.id, targetId: target })
          )
        );
      })
    );

    return Promise.all(
      ids.map(id =>
        Promise.all([
          update('payee_mapping', { id, targetId: target }),
          delete_('payees', id)
        ])
      )
    );
  });
}

export function getPayees() {
  return all(`
        SELECT p.*, COALESCE(a.name, p.name) AS name FROM payees p
        LEFT JOIN accounts a ON (p.transfer_acct = a.id AND a.tombstone = 0)
        WHERE p.tombstone = 0 AND (p.transfer_acct IS NULL OR a.id IS NOT NULL)
        ORDER BY p.transfer_acct IS NULL DESC, p.name COLLATE NOCASE
    `);
}

export async function getOrphanedPayees() {
  const rows = await all(`
        SELECT p.id FROM payees p
        LEFT JOIN payee_mapping pm ON pm.id = p.id
        LEFT JOIN v_transactions_internal_alive t ON t.payee = pm.targetId
        WHERE p.tombstone = 0 AND p.transfer_acct IS NULL AND t.id IS NULL
    `);
  return rows.map(row => row.id);
}

export async function getPayeeByName(name) {
  return first(`SELECT * FROM payees WHERE LOWER(name) = ? AND tombstone = 0`, [
    name.toLowerCase()
  ]);
}

export function insertPayeeRule(rule) {
  rule = payeeRuleModel.validate(rule);
  return insertWithUUID('payee_rules', rule);
}

export function deletePayeeRule(rule) {
  return delete_('payee_rules', rule.id);
}

export function updatePayeeRule(rule) {
  rule = payeeModel.validate(rule, { update: true });
  return update('payee_rules', rule);
}

export function getPayeeRules(id) {
  return all(
    `SELECT pr.* FROM payee_rules pr
        LEFT JOIN payee_mapping pm ON pm.id = pr.payee_id
        WHERE pm.targetId = ? AND pr.tombstone = 0`,
    [id]
  );
}
