import { Query } from '../../../shared/query';
import {
  runQuery as _runQuery,
  runCompiledQuery as _runCompiledQuery
} from '../exec';

import schemaExecutors from './executors';

import { schema, schemaConfig } from './index';

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
