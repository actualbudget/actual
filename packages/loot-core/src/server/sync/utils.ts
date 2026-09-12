import { app } from '#server/main-app';

export function isError(value: unknown): value is { error: unknown } {
  return (value as { error: unknown }).error !== undefined;
}

// Sync messages carry table/column names as data, and a newer app
// version may name a column with an SQL keyword — unquoted, that raises
// a syntax error instead of the missing-column error the deferral path
// relies on.
export function quoteSqlId(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

// Notify once per loaded budget (reset on budget load); the client-side
// notification id additionally dedupes while it's displayed
let hasNotifiedDeferredMessages = false;

export function resetDeferredMessagesNotification() {
  hasNotifiedDeferredMessages = false;
}

export function notifyDeferredMessages() {
  if (!hasNotifiedDeferredMessages) {
    hasNotifiedDeferredMessages = true;
    app.events.emit('sync', { type: 'deferred-messages' });
  }
}

// A deferred change was dropped or discarded. Emitted per incident; the
// client-side notification id dedupes while one is displayed.
export function notifyDroppedMessages() {
  app.events.emit('sync', { type: 'dropped-messages' });
}
