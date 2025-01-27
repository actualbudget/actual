// @ts-strict-ignore
import { Query, type QueryState } from '../../../shared/query';
import {
  runQuery as _runQuery,
  runCompiledQuery as _runCompiledQuery,
} from '../exec';

import { schemaExecutors } from './executors';

import { schema, schemaConfig } from './index';

/**
 * Run the pre-compiled AQL query.
 * @param query The pre-compiled AQL query.
 * @param sqlPieces The compiled SQL pieces.
 * @param state The query state.
 * @param params The query parameters.
 * @returns The queried data.
 */
export function runCompiledQuery(query, sqlPieces, state, params?: unknown) {
  return _runCompiledQuery(query, sqlPieces, state, {
    params,
    executors: schemaExecutors,
  });
}

/**
 * Compile and run the AQL query.
 * @param query The AQL query to compile and run.
 * @param params The query parameters.
 * @returns The queried data and its dependencies.
 */
export function runQuery(query: Query | QueryState, params?: unknown) {
  if (query instanceof Query) {
    query = query.serialize();
  }

  return _runQuery(schema, schemaConfig, query, {
    params,
    executors: schemaExecutors,
  });
}
