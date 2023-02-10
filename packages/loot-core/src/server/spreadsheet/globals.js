function first(arr) {
  return arr[0];
}

function firstValue(arr) {
  const keys = Object.keys(arr[0]);
  return arr[0][keys[0]];
}

function number(v) {
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

function min(x, y) {
  return Math.min(x, y);
}

function max(x, y) {
  return Math.max(x, y);
}

module.exports = {
  first,
  firstValue,
  number,
  min,
  max,
};
