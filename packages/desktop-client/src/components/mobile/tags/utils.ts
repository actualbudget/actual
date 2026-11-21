export function sanitiseTagName(value: string) {
  return value
    .replace(/#/g, '')
    .trim()
    .replace(/-*\s[\s-]*/g, '-');
}

export function sanitiseTagNameInput(value: string) {
  const withoutLeading = value.replace(/#/g, '').replace(/^\s+/, '');
  const hasTrailingSpace = /\s$/.test(withoutLeading);
  const name = sanitiseTagName(withoutLeading);
  return hasTrailingSpace && name !== '' ? `${name} ` : name;
}

export function getTagTransactionsLocationState(tagName: string) {
  return {
    goBack: true,
    filterConditions: [
      {
        field: 'notes',
        op: 'hasTags',
        value: `#${tagName}`,
        type: 'string',
      },
    ],
  };
}
