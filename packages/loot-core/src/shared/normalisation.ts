export function getNormalisedString(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function normalisedEquals(a: string, b: string) {
  return getNormalisedString(a) === getNormalisedString(b);
}

export function normalisedIncludes(a: string, b: string) {
  return getNormalisedString(a).includes(getNormalisedString(b));
}
