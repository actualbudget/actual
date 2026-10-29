import type { TransactionEntity } from '#types/models';

export type SchedulePaymentInput = Pick<
  TransactionEntity,
  'id' | 'date' | 'schedule' | 'parent_id' | 'transfer_id' | 'tombstone'
>;

// A split's parent/children and a transfer's two legs represent one payment.
// Retain the linked row IDs so an explicit occurrence can reserve that payment.
export function getSchedulePayments(
  transactions: SchedulePaymentInput[],
  scheduleId: string,
) {
  const linked = transactions.filter(
    transaction =>
      transaction.schedule === scheduleId && !transaction.tombstone,
  );
  const parents = new Map<string, string>();

  function root(id: string): string {
    const parent = parents.get(id);
    if (parent == null || parent === id) {
      return id;
    }
    const result = root(parent);
    parents.set(id, result);
    return result;
  }

  for (const transaction of linked) {
    for (const relatedId of [transaction.parent_id, transaction.transfer_id]) {
      if (relatedId) {
        const left = root(transaction.id);
        const right = root(relatedId);
        if (left !== right) {
          parents.set(left, right);
        }
      }
    }
  }

  const payments = new Map<
    string,
    { date: string; transactionIds: string[] }
  >();
  for (const transaction of linked) {
    const id = root(transaction.id);
    const payment = payments.get(id);
    if (payment) {
      payment.transactionIds.push(transaction.id);
      if (transaction.date < payment.date) {
        payment.date = transaction.date;
      }
    } else {
      payments.set(id, {
        date: transaction.date,
        transactionIds: [transaction.id],
      });
    }
  }
  return [...payments.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}
