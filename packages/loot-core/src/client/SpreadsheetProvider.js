import React, { useEffect, useMemo } from 'react';

import LRU from 'lru-cache';

import SpreadsheetContext from 'loot-design/src/components/spreadsheet/SpreadsheetContext';

import { listen, send } from '../platform/client/fetch';

function makeSpreadsheet() {
  const cellObservers = {};
  const LRUValueCache = new LRU({ max: 1200 });
  const cellCache = {};
  let observersDisabled = false;

  class Spreadsheet {
    observeCell(name, cb) {
      if (!cellObservers[name]) {
        cellObservers[name] = [];
      }
      cellObservers[name].push(cb);

      return () => {
        cellObservers[name] = cellObservers[name].filter(x => x !== cb);

        if (cellObservers[name].length === 0) {
          cellCache[name] = null;
        }
      };
    }

    disableObservers() {
      observersDisabled = true;
    }

    enableObservers() {
      observersDisabled = false;
    }

    prewarmCache(name, value) {
      LRUValueCache.set(name, value);
    }

    listen() {
      return listen('cells-changed', function (nodes) {
        if (!observersDisabled) {
          // TODO: batch react so only renders once
          nodes.forEach(node => {
            const observers = cellObservers[node.name];
            if (observers) {
              observers.forEach(func => func(node));
              cellCache[node.name] = Promise.resolve(node);
              LRUValueCache.set(node.name, node);
            }
          });
        }
      });
    }

    bind(sheetName = '__global', binding, fields, cb) {
      binding =
        typeof binding === 'string' ? { name: binding, value: null } : binding;

      let resolvedName = `${sheetName}!${binding.name}`;
      let cleanup = this.observeCell(resolvedName, cb);

      // Always synchronously call with the existing value if it has one.
      // This is a display optimization to avoid flicker. The LRU cache
      // will keep a number of recent nodes in memory.
      if (LRUValueCache.has(resolvedName)) {
        cb(LRUValueCache.get(resolvedName));
      }

      if (cellCache[resolvedName] != null) {
        cellCache[resolvedName].then(cb);
      } else {
        const req = this.get(sheetName, binding.name, fields);
        cellCache[resolvedName] = req;

        req.then(result => {
          // We only want to call the callback if it's still waiting on
          // the same request. If we've received a `cells-changed` event
          // for this already then it's already been called and we don't
          // need to call it again (and potentially could be calling it
          // with an old value depending on the order of messages)
          if (cellCache[resolvedName] === req) {
            LRUValueCache.set(resolvedName, result);
            cb(result);
          }
        });
      }

      return cleanup;
    }

    get(sheetName, name) {
      return send('getCell', { sheetName, name });
    }

    getCellNames(sheetName) {
      return send('getCellNamesInSheet', { sheetName });
    }

    createQuery(sheetName, name, query) {
      return send('create-query', {
        sheetName,
        name,
        query: query.serialize()
      });
    }
  }

  return new Spreadsheet();
}

export function SpreadsheetProvider({ children }) {
  let spreadsheet = useMemo(() => makeSpreadsheet(), []);

  useEffect(() => {
    return spreadsheet.listen();
  }, [spreadsheet]);

  return (
    <SpreadsheetContext.Provider value={spreadsheet}>
      {children}
    </SpreadsheetContext.Provider>
  );
}
