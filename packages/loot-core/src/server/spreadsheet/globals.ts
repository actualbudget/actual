export function number(v: unknown): number {
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
