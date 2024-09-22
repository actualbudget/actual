// @ts-strict-ignore
export function fraction(num, denom) {
  if (denom === 0) {
    if (num > 0) {
      return 1;
    }
    return 0;
  }

  return num / denom;
}
