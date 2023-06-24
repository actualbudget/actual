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
