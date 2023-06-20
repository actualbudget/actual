export function unresolveName(name) {
  let idx = name.indexOf('!');
  if (idx !== -1) {
    return {
      sheet: name.slice(0, idx),
      name: name.slice(idx + 1),
    };
  }
  return { sheet: null, name };
}

export function resolveName(sheet, name) {
  return sheet + '!' + name;
}
