// @ts-strict-ignore
export function unresolveName(name) {
  const idx = name.indexOf('!');
  if (idx !== -1) {
    return {
      sheet: name.slice(0, idx),
      name: name.slice(idx + 1),
    };
  }
  return { sheet: null, name };
}

export function resolveName(sheet: string, name: string): string {
  return sheet + '!' + name;
}
