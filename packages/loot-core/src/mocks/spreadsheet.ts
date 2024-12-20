// @ts-strict-ignore
export function makeSpreadsheet() {
  const cells = {};
  return {
    observers: [],
    _getNode(sheetName, name) {
      const resolvedName = `${sheetName}!${name}`;

      const existing = cells[resolvedName];
      if (existing) {
        return existing;
      }

      cells[resolvedName] = {
        name: resolvedName,
        sheet: sheetName,
        value: null,
      };
      return cells[resolvedName];
    },

    prewarmCache(sheetName = '__global', name, value) {
      this._getNode(sheetName, name).value = value;
    },

    bind(sheetName, binding, cb) {
      const { name } = binding;
      const resolvedName = `${sheetName}!${name}`;
      if (!this.observers[resolvedName]) {
        this.observers[resolvedName] = [];
      }
      this.observers[resolvedName].push(cb);

      const node = this._getNode(sheetName, name);
      cb(node);

      // bind returns a function which unsubscribes itself. In this mock
      // it's a noop.
      return () => {
        this.observers[resolvedName] = this.observers[resolvedName].filter(
          x => x !== cb,
        );
      };
    },

    create(sheetName, name, expr) {
      this.set(sheetName, name, expr);
    },

    get(sheetName, name) {
      return this._getNode(sheetName, name);
    },

    getValue(sheetName, name) {
      return this._getNode(sheetName, name).value;
    },

    set(sheetName, name, expr) {
      const node = this._getNode(sheetName, name);
      node.value = expr;

      const resolvedName = `${sheetName}!${name}`;
      if (this.observers[resolvedName]) {
        this.observers[resolvedName].forEach(cb => cb(node));
      }
    },

    getCellNames(sheetName) {
      const names = Object.keys(cells);
      if (sheetName) {
        return names.filter(name => name.startsWith(sheetName + '!'));
      }
      return names;
    },

    getCells() {
      return cells;
    },

    setCells(cells) {
      Object.keys(cells).forEach(sheet => {
        Object.keys(cells[sheet]).forEach(name => {
          this.set(sheet, name, cells[sheet][name]);
        });
      });
    },

    deleteCells(cells) {
      Object.keys(cells).forEach(sheet => {
        cells[sheet].forEach(name => {
          this.set(sheet, name, '');
        });
      });
    },

    batchChange(batch) {
      this.setCells(batch.updateCells);
      this.deleteCells(batch.deleteCells);
    },
  };
}
