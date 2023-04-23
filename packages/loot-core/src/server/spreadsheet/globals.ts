export function first(arr) {
  return arr[0];
}

export function firstValue(arr) {
  const keys = Object.keys(arr[0]);
  return arr[0][keys[0]];
}

export function number(v) {
  if (typeof v === 'number') {
    return v;
  } else if (typeof v === 'string') {
    const parsed = parseFloat(v);
    if (isNaN(parsed)) {
      return 0;
    }
    return parsed;
  }

  return 0;
}

export function min(x, y) {
  return Math.min(x, y);
}

export function max(x, y) {
  return Math.max(x, y);
}
