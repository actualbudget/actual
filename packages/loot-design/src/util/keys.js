// TODO: This is a barebones module for now, need to think about a
// generic way keys are handled across the app

export const keys = {
  ESC: 27,
  TAB: 9,
  ENTER: 13,
  SHIFT: 16,
  ALT: 18,
  META: 91,
  CTRL: 17,
  SPACE: 32,
  UP: 38,
  DOWN: 40,
  J: 74,
  K: 75,
  X: 88,
};

let _keyHandlers = {};

let _modifierState = {
  shift: false,
  ctrl: false,
  alt: false,
  meta: false,
};

export function hasModifierKey(modifier) {
  return !!_modifierState[modifier];
}

export function registerKeyHandler(key, func) {
  if (!_keyHandlers[key]) {
    _keyHandlers[key] = [];
  }
  _keyHandlers[key].push(func);

  return () => {
    _keyHandlers[key] = _keyHandlers[key].filter(f => f !== func);
  };
}

document.addEventListener('keydown', e => {
  if (e.keyCode === keys.SHIFT) {
    _modifierState.shift = true;
  }
  if (e.keyCode === keys.CTRL) {
    _modifierState.ctrl = true;
  }
  if (e.keyCode === keys.ALT) {
    _modifierState.alt = true;
  }
  if (e.keyCode === keys.META) {
    _modifierState.meta = true;
  }

  if (!(e.target && e.target.matches('input'))) {
    let handlers = _keyHandlers[e.key.toUpperCase()];
    if (handlers && handlers.length > 0) {
      handlers[handlers.length - 1](_modifierState);
      e.preventDefault();
      e.stopPropagation();
    }
  }
});

document.addEventListener('keyup', e => {
  if (e.keyCode === keys.SHIFT) {
    _modifierState.shift = false;
  }
  if (e.keyCode === keys.CTRL) {
    _modifierState.ctrl = false;
  }
  if (e.keyCode === keys.ALT) {
    _modifierState.alt = false;
  }
  if (e.keyCode === keys.META) {
    _modifierState.meta = false;
  }
});
