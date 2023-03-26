// TODO: This is a barebones module for now, need to think about a
// generic way keys are handled across the app

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
  if (e.key === 'Shift') {
    _modifierState.shift = true;
  }
  if (e.key === 'Control') {
    _modifierState.ctrl = true;
  }
  if (e.key === 'Alt') {
    _modifierState.alt = true;
  }
  if (e.key === 'Meta') {
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
  if (e.key === 'Shift') {
    _modifierState.shift = false;
  }
  if (e.key === 'Control') {
    _modifierState.ctrl = false;
  }
  if (e.key === 'Alt') {
    _modifierState.alt = false;
  }
  if (e.key === 'Meta') {
    _modifierState.meta = false;
  }
});
