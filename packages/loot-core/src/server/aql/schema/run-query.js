import { schema, schemaConfig } from './index';
import { default as schemaExecutors } from './executors';
import {
  runQuery as _runQuery,
  runCompiledQuery as _runCompiledQuery
} from '../exec';
import { Query } from '../../../shared/query';

export function runCompiledQuery(query, sqlPieces, state, params) {
  return _runCompiledQuery(query, sqlPieces, state, {
    params,
    executors: schemaExecutors
  });
}

export function runQuery(query, params) {
  if (query instanceof Query) {
    query = query.serialize();
  }

  return _runQuery(schema, schemaConfig, query, {
    params,
    executors: schemaExecutors
  });
}
