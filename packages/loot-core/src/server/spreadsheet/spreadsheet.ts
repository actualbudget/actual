// @ts-strict-ignore
import mitt from 'mitt';

import { QueryState } from '../../shared/query';
import { compileQuery, aqlCompiledQuery, schema, schemaConfig } from '../aql';
import { BudgetType } from '../prefs';

import { Graph } from './graph-data-structure';
import { unresolveName, resolveName } from './util';

export type Node = {
  name: string;
  expr: string | number | boolean;
  value: string | number | boolean;
  sheet: unknown;
  query?: QueryState;
  sql?: { sqlPieces: unknown; state: { dependencies: unknown[] } };
  dynamic?: boolean;
  _run?: unknown;
  _dependencies?: string[];
};

export class Spreadsheet {
  _meta: {
    createdMonths: Set<string>;
    budgetType: BudgetType;
  };
  cacheBarrier;
  computeQueue;
  dirtyCells;
  events;
  graph;
  nodes: Map<string, Node>;
  running;
  saveCache;
  setCacheStatus;
  transactionDepth;

  constructor(saveCache?: unknown, setCacheStatus?: unknown) {
    // @ts-expect-error Graph should be converted to class
    this.graph = new Graph();
    this.nodes = new Map<string, Node>();
    this.transactionDepth = 0;
    this.saveCache = saveCache;
    this.setCacheStatus = setCacheStatus;
    this.dirtyCells = [];
    this.computeQueue = [];
    this.events = mitt();
    this._meta = {
      createdMonths: new Set(),
      budgetType: 'envelope',
    };
  }

  meta() {
    return this._meta;
  }

  setMeta(meta) {
    this._meta = meta;
  }

  // Spreadsheet interface

  _getNode(name: string): Node {
    const { sheet } = unresolveName(name);

    if (!this.nodes.has(name)) {
      this.nodes.set(name, {
        name,
        expr: null,
        value: null,
        sheet,
      });
    }
    return this.nodes.get(name);
  }

  getNode(name) {
    return this._getNode(name);
  }

  hasCell(name) {
    return this.nodes.has(name);
  }

  add(name, expr) {
    this.set(name, expr);
  }

  getNodes() {
    return this.nodes;
  }

  serialize() {
    return {
      graph: this.graph.getEdges(),
      nodes: [...this.nodes.entries()],
    };
  }

  transaction(func) {
    this.startTransaction();
    try {
      func();
    } catch (e) {
      console.log(e);
    }
    return this.endTransaction();
  }

  startTransaction() {
    this.transactionDepth++;
  }

  endTransaction() {
    this.transactionDepth--;

    if (this.transactionDepth === 0) {
      const cells = this.dirtyCells;
      this.dirtyCells = [];

      this.queueComputation(this.graph.topologicalSort(cells));
    }

    return [];
  }

  queueComputation(cellNames) {
    // TODO: Formally write out the different cases when the existing
    // queue is not empty. There should be cases where we can easily
    // optimize this by skipping computations if we know they are
    // going to be computed again. The hard thing is to ensure that
    // the order of computations stays correct

    this.computeQueue = this.computeQueue.concat(cellNames);

    // Begin running on the next tick so we guarantee that it doesn't finish
    // within the same tick. Since some computations are async, this makes it
    // consistent (otherwise it would only sometimes finish sync)
    Promise.resolve().then(() => {
      if (!this.running) {
        this.runComputations();
      }
    });
  }

  runComputations(idx = 0) {
    this.running = true;

    while (idx < this.computeQueue.length) {
      const name = this.computeQueue[idx];
      let node;
      let result;

      try {
        node = this.getNode(name);

        if (node._run) {
          const args = node._dependencies.map(dep => {
            return this.getNode(dep).value;
          });

          result = node._run(...args);

          if (result instanceof Promise) {
            console.warn(
              `dynamic cell ${name} returned a promise! this is discouraged because errors are not handled properly`,
            );
          }
        } else if (node.sql) {
          result = aqlCompiledQuery(
            node.query,
            node.sql.sqlPieces,
            node.sql.state,
          );
        } else {
          idx++;
          continue;
        }
      } catch (e) {
        console.log('Error while evaluating ' + name + ':', e);
        // If an error happens, bail on the rest of the computations
        this.running = false;
        this.computeQueue = [];
        return;
      }

      if (result instanceof Promise) {
        // When the cell is finished computing, finish computing the
        // rest
        result.then(
          value => {
            node.value = value;
            this.runComputations(idx + 1);
          },
          err => {
            // TODO: use captureException here
            console.warn(`Failed running ${node.name}!`, err);
            this.runComputations(idx + 1);
          },
        );

        return;
      } else {
        node.value = result;
      }

      idx++;
    }

    // If everything computed in one loop (no async operations) notify
    // the user and empty the queue
    if (idx === this.computeQueue.length) {
      this.events.emit('change', { names: this.computeQueue });

      // Cache the updated cells
      if (typeof this.saveCache === 'function') {
        this.saveCache(this.computeQueue);
      }
      this.markCacheSafe();

      this.running = false;
      this.computeQueue = [];
    }
  }

  markCacheSafe() {
    if (!this.cacheBarrier) {
      if (this.setCacheStatus) {
        this.setCacheStatus({ clean: true });
      }
    }
  }

  markCacheDirty() {
    if (this.setCacheStatus) {
      this.setCacheStatus({ clean: false });
    }
  }

  startCacheBarrier() {
    this.cacheBarrier = true;
    this.markCacheDirty();
  }

  endCacheBarrier() {
    this.cacheBarrier = false;

    const pendingChange = this.running || this.computeQueue.length > 0;
    if (!pendingChange) {
      this.markCacheSafe();
    }
  }

  addEventListener(name, func) {
    this.events.on(name, func);
    return () => this.events.off(name, func);
  }

  onFinish(func) {
    if (this.transactionDepth !== 0) {
      throw new Error(
        'onFinish called while inside a spreadsheet transaction. This is not allowed as it will lead to race conditions',
      );
    }

    if (!this.running && this.computeQueue.length === 0) {
      func([]);
      // The remove function does nothing
      return () => {};
    }

    const remove = this.addEventListener('change', (...args) => {
      remove();
      return func(...args);
    });
    return remove;
  }

  unload() {
    this.events.all.clear();
  }

  getValue(name) {
    return this.getNode(name).value;
  }

  getExpr(name) {
    return this.getNode(name).expr;
  }

  getCellValue(sheet, name) {
    return this.getNode(resolveName(sheet, name)).value;
  }

  getCellExpr(sheet, name) {
    return this.getNode(resolveName(sheet, name)).expr;
  }

  getCellValueLoose(sheetName, cellName) {
    const name = resolveName(sheetName, cellName);
    if (this.nodes.has(name)) {
      return this.getNode(name).value;
    }
    return null;
  }

  bootup(onReady) {
    this.onFinish(() => {
      onReady();
    });
  }

  load(name: string, value: string | number | boolean): void {
    const node = this._getNode(name);
    node.expr = value;
    node.value = value;
  }

  create(name: string, value: string | number | boolean) {
    return this.transaction(() => {
      const node = this._getNode(name);
      node.expr = value;
      node.value = value;
      this._markDirty(name);
    });
  }

  set(name: string, value: string | number | boolean): void {
    this.create(name, value);
  }

  recompute(name: string): void {
    this.transaction(() => {
      this.dirtyCells.push(name);
    });
  }

  recomputeAll(): void {
    // Recompute everything!
    this.transaction(() => {
      this.dirtyCells = [...this.nodes.keys()];
    });
  }

  createQuery(sheetName: string, cellName: string, query: QueryState): void {
    const name = resolveName(sheetName, cellName);
    const node = this._getNode(name);

    if (node.query !== query) {
      node.query = query;
      const { sqlPieces, state } = compileQuery(
        node.query,
        schema,
        schemaConfig,
      );
      node.sql = { sqlPieces, state };

      this.transaction(() => {
        this._markDirty(name);
      });
    }
  }

  createStatic(
    sheetName: string,
    cellName: string,
    initialValue: number | boolean,
  ): void {
    const name = resolveName(sheetName, cellName);
    const exists = this.nodes.has(name);
    if (!exists) {
      this.create(name, initialValue);
    }
  }

  createDynamic(
    sheetName: string,
    cellName: string,
    {
      dependencies = [],
      run,
      initialValue,
      refresh = false,
    }: {
      dependencies?: string[];
      run?: unknown;
      initialValue: number | boolean;
      refresh?: boolean;
    },
  ): void {
    const name = resolveName(sheetName, cellName);
    const node = this._getNode(name);

    if (node.dynamic) {
      // If it already exists, do nothing
      return;
    }

    node.dynamic = true;
    node._run = run;

    dependencies = dependencies.map(dep => {
      let resolved;
      if (!unresolveName(dep).sheet) {
        resolved = resolveName(sheetName, dep);
      } else {
        resolved = dep;
      }

      return resolved;
    });

    node._dependencies = dependencies;

    // TODO: diff these
    this.graph.removeIncomingEdges(name);
    dependencies.forEach(dep => {
      this.graph.addEdge(dep, name);
    });

    if (node.value == null || refresh) {
      this.transaction(() => {
        node.value = initialValue;
        this._markDirty(name);
      });
    }
  }

  clearSheet(sheetName: string): void {
    for (const [name, node] of this.nodes.entries()) {
      if (node.sheet === sheetName) {
        this.nodes.delete(name);
      }
    }
  }

  voidCell(sheetName: string, name: string, voidValue = null): void {
    const node = this.getNode(resolveName(sheetName, name));
    node._run = null;
    node.dynamic = false;
    node.value = voidValue;
  }

  deleteCell(sheetName: string, name: string): void {
    this.voidCell(sheetName, name);
    this.nodes.delete(resolveName(sheetName, name));
  }

  addDependencies(sheetName: string, cellName: string, deps: string[]): void {
    const name = resolveName(sheetName, cellName);

    deps = deps.map(dep => {
      if (!unresolveName(dep).sheet) {
        return resolveName(sheetName, dep);
      }
      return dep;
    });

    const node = this.getNode(name);
    const newDeps = deps.filter(
      dep => (node._dependencies || []).indexOf(dep) === -1,
    );

    if (newDeps.length > 0) {
      node._dependencies = (node._dependencies || []).concat(newDeps);
      newDeps.forEach(dep => {
        this.graph.addEdge(dep, name);
      });
      this.recompute(name);
    }
  }

  removeDependencies(
    sheetName: string,
    cellName: string,
    deps: string[],
  ): void {
    const name = resolveName(sheetName, cellName);

    deps = deps.map(dep => {
      if (!unresolveName(dep).sheet) {
        return resolveName(sheetName, dep);
      }
      return dep;
    });

    const node = this.getNode(name);

    node._dependencies = (node._dependencies || []).filter(
      dep => deps.indexOf(dep) === -1,
    );

    deps.forEach(dep => {
      this.graph.removeEdge(dep, name);
    });
    this.recompute(name);
  }

  _markDirty(name) {
    this.dirtyCells.push(name);
  }

  triggerDatabaseChanges(oldValues, newValues) {
    const tables = new Set([...oldValues.keys(), ...newValues.keys()]);

    this.startTransaction();
    // TODO: Create an index of deps so we don't have to iterate
    // across all nodes
    this.nodes.forEach(node => {
      if (
        node.sql &&
        node.sql.state.dependencies.some(dep => tables.has(dep))
      ) {
        this._markDirty(node.name);
      }
    });
    this.endTransaction();
  }
}
