import { Query, type QueryState } from '../../shared/query';

import { type CompilerState, type SqlPieces } from './compiler';
import {
  compileAndRunAqlQuery,
  runCompiledAqlQuery,
  type AqlQueryParams,
} from './exec';
import { schema, schemaConfig } from './schema';
import { schemaExecutors } from './schema/executors';

export {
  convertForInsert,
  convertForUpdate,
  convertFromSelect,
  convertInputType,
} from './schema-helpers';
export { compileQuery } from './compiler';
export { makeViews } from './views';
export { schema, schemaConfig } from './schema';

export function aqlCompiledQuery(
  queryState: QueryState,
  sqlPieces: SqlPieces,
  compilerState: CompilerState,
  params?: AqlQueryParams,
) {
  return runCompiledAqlQuery(queryState, sqlPieces, compilerState, {
    params,
    executors: schemaExecutors,
  });
}

export function aqlQuery(query: Query | QueryState, params?: AqlQueryParams) {
  if (query instanceof Query) {
    query = query.serialize();
  }

  return compileAndRunAqlQuery(schema, schemaConfig, query, {
    params,
    executors: schemaExecutors,
  });
}
