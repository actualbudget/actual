const iMap: Record<string, string> = {
  ł: 'l',
  ø: 'o',
  ß: 'ss',
  œ: 'oe',
};
const iRegex = new RegExp(Object.keys(iMap).join('|'), 'g');

export function getNormalisedString(value: string) {
  return value
    .toLowerCase()
    .replace(iRegex, m => iMap[m])
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
