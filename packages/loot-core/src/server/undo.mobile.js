export function appendMessages(messages, oldData) {}
export function clearUndo() {}
export async function undo() {}
export async function redo() {}

export function withUndo(func, meta) {
  return func();
}

export function undoable(func) {
  return func;
}
