import { insertWithUUID, insert, first, delete_, update, all } from "../db";
import { DbPayee, DbPayeeMapping } from "../types";
import { payeeModel } from "../../models";
import { batchMessages } from "../../sync";
import { groupById } from "../../../shared/util";
import { WithRequired } from "../../../types/util";

export async function insertPayee(
  payee: WithRequired<Partial<DbPayee>, 'name'>,
) {
  payee = payeeModel.validate(payee);
  let id: DbPayee['id'] | undefined;
  await batchMessages(async () => {
    id = await insertWithUUID('payees', payee);
    await insert('payee_mapping', { id, targetId: id });
  });
  return id;
}

export async function deletePayee(payee: Pick<DbPayee, 'id'>) {
  const dbPayee = await first<DbPayee>(
    'SELECT * FROM payees WHERE id = ?',
    [payee.id],
  );
  const { transfer_acct } = dbPayee ?? {};
  if (transfer_acct) {
    // You should never be able to delete transfer payees
    return;
  }

  return delete_('payees', payee.id);
}

export async function deleteTransferPayee(payee: Pick<DbPayee, 'id'>) {
  // This allows deleting transfer payees
  return delete_('payees', payee.id);
}

export function updatePayee(payee: WithRequired<Partial<DbPayee>, 'id'>) {
  payee = payeeModel.validate(payee, { update: true });
  return update('payees', payee);
}

export async function mergePayees(
  target: DbPayee['id'],
  ids: Array<DbPayee['id']>,
) {
  // Load in payees so we can check some stuff
  const dbPayees: DbPayee[] = await all<DbPayee>('SELECT * FROM payees');
  const payees = groupById(dbPayees);

  // Filter out any transfer payees
  if (payees[target].transfer_acct != null) {
    return;
  }
  ids = ids.filter(id => payees[id].transfer_acct == null);

  await batchMessages(async () => {
    await Promise.all(
      ids.map(async id => {
        const mappings = await all<DbPayeeMapping>(
          'SELECT id FROM payee_mapping WHERE targetId = ?',
          [id],
        );
        await Promise.all(
          mappings.map(m =>
            update('payee_mapping', { id: m.id, targetId: target }),
          ),
        );
      }),
    );

    await Promise.all(
      ids.map(id =>
        Promise.all([
          update('payee_mapping', { id, targetId: target }),
          delete_('payees', id),
        ]),
      ),
    );
  });
}
