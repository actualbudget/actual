import { app } from '#server/main-app';

// Only notify the user once per loaded budget about data deferred
// because it comes from a newer version of the app (reset on budget
// load; the client-side notification id dedupes while it's displayed,
// this additionally avoids re-nagging after the user dismisses it)
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

// A deferred change from another device could not be applied (or a sync
// reset made this file the source of truth without it) — the user
// should know their devices may disagree. No once-per-load flag: each
// emission is a discrete incident, and the client-side notification id
// dedupes while one is displayed.
export function notifyDroppedMessages() {
  app.events.emit('sync', { type: 'dropped-messages' });
}
