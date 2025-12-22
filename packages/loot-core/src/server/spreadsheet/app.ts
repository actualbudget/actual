import { type QueryState } from '../../shared/query';
import { createApp } from '../app';
import * as sheet from '../sheet';

import { resolveName, unresolveName } from './util';

export type SpreadsheetHandlers = {
  'get-cell': typeof getCell;
  'get-cell-names': typeof getCellNames;
  'create-query': typeof createQuery;
};

// Expose functions to the client
export const app = createApp<SpreadsheetHandlers>();
app.method('get-cell', getCell);
app.method('get-cell-names', getCellNames);
app.method('create-query', createQuery);

async function getCell({
  sheetName,
  name,
}: {
  sheetName: string;
  name: string;
}) {
  const node = sheet.get()._getNode(resolveName(sheetName, name));
  return { name: node.name, value: node.value };
}

async function getCellNames({ sheetName }: { sheetName: string }) {
  const names = [];
  for (const name of sheet.get().getNodes().keys()) {
    const { sheet: nodeSheet, name: nodeName } = unresolveName(name);
    if (nodeSheet === sheetName) {
      names.push(nodeName);
    }
  }
  return names;
}

async function createQuery({
  sheetName,
  name,
  query,
}: {
  sheetName: string;
  name: string;
  query: QueryState;
}) {
  // Always run it regardless of cache. We don't know anything has changed
  // between the cache value being saved and now
  sheet.get().createQuery(sheetName, name, query);
  return 'ok';
}
