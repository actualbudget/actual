import * as db from '../db';

export function getMessagesSince(since) {
    return db.runQuery(
        'SELECT timestamp, dataset, row, column, value FROM messages_crdt WHERE timestamp > ?',
        [since],
        true
    );
}

export function getTablesFromMessages(messages) {
    return messages.reduce((acc, message) => {
      let dataset =
        message.dataset === 'schedules_next_date' ? 'schedules' : message.dataset;
  
      if (!acc.includes(dataset)) {
        acc.push(dataset);
      }
      return acc;
    }, []);
}
