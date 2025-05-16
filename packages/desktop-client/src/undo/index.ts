import { send } from 'loot-core/platform/client/fetch';

function throttle(callback: () => void, wait: number) {
  let waiting = false;
  return () => {
    if (!waiting) {
      callback();
      waiting = true;
      setTimeout(function () {
        waiting = false;
      }, wait);
    }
  };
}

const _undo = throttle(() => send('undo'), 100);
const _redo = throttle(() => send('redo'), 100);

let _undoEnabled = true;

export function enableUndo() {
  _undoEnabled = true;
}

export function disableUndo() {
  _undoEnabled = false;
}

export function undo() {
  if (_undoEnabled) {
    _undo();
  }
}

export function redo() {
  if (_undoEnabled) {
    _redo();
  }
}
