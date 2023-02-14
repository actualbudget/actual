export const MOV = Symbol('mov');
export const CALL = Symbol('call');
export const QUERY = Symbol('query');
export const UOP = Symbol('uop');
export const BOP = Symbol('bop');
export const JUMPF = Symbol('jumpf');
export const JUMPT = Symbol('jumpt');

export const REG1 = { type: '__reg', index: 1 };

export function SP(n) {
  return { type: '__stack', index: n };
}

export function VAR(name) {
  return { type: '__var', name: name };
}

export function LABEL() {
  let idx = null;
  return {
    get() {
      if (idx === null) {
        throw new Error('Attempted access of unresolved label');
      }
      return idx;
    },

    resolve(n) {
      idx = n;
    },
  };
}
