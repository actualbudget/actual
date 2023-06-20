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

export function resolveNamesAsObjects(sheets) {
  const cells = {};
  Object.keys(sheets).forEach(sheetName => {
    const sheet = sheets[sheetName];

    Object.keys(sheet).forEach(name => {
      const expr = sheet[name];
      cells[resolveName(sheetName, name)] = expr;
    });
  });
  return cells;
}

export function resolveNamesAsArrays(sheets) {
  const cells = [];
  Object.keys(sheets).forEach(sheetName => {
    const sheet = sheets[sheetName];

    sheet.forEach(name => {
      cells.push(resolveName(sheetName, name));
    });
  });
  return cells;
}
