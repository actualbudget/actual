import { CompileError } from "./errors";
import { CompilerState, PathInfo } from "./types";

let _uid: number = 0;
export function resetUid(): void {
  _uid = 0;
}

function uid(tableName: string): string {
  _uid++;
  return tableName + _uid;
}

export function popPath(path: string): {path: string, field: string} {
  let parts = path.split('.');
  return { path: parts.slice(0, -1).join('.'), field: parts[parts.length - 1] };
}

export function makePath(state: CompilerState, path: string): PathInfo {
    let { schema, paths } = state;
  
    let parts = path.split('.');
    if (parts.length < 2) {
      throw new CompileError('Invalid path: ' + path);
    }
  
    let initialTable = parts[0];
  
    let tableName = parts.slice(1).reduce((tableName, field) => {
      let table = schema[tableName];
  
      if (table == null) {
        throw new CompileError(`Path error: ${tableName} table does not exist`);
      }
  
      if (!table[field] || table[field].ref == null) {
        throw new CompileError(
          `Field not joinable on table ${tableName}: "${field}"`
        );
      }
  
      return table[field].ref;
    }, initialTable);
  
    let joinTable;
    let parentParts = parts.slice(0, -1);
    if (parentParts.length === 1) {
      joinTable = parentParts[0];
    } else {
      let parentPath = parentParts.join('.');
      let parentDesc = paths.get(parentPath);
      if (!parentDesc) {
        throw new CompileError('Path does not exist: ' + parentPath);
      }
      joinTable = parentDesc.tableId;
    }
  
    return {
      tableName: tableName,
      tableId: uid(tableName),
      joinField: parts[parts.length - 1],
      joinTable
    };
  }
  
export function resolvePath(state: CompilerState, path: string): PathInfo {
    let paths = path.split('.');
  
    paths = paths.reduce(
      (acc, name) => {
        let fullName = acc.context + '.' + name;
        return {
          context: fullName,
          path: [...acc.path, fullName]
        };
      },
      { context: state.implicitTableName, path: [] }
    ).path;
  
    paths.forEach(path => {
      if (!state.paths.get(path)) {
        state.paths.set(path, makePath(state, path));
      }
    });
  
    let pathInfo = state.paths.get(paths[paths.length - 1]);
    return pathInfo;
  }
