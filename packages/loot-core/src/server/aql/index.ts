import { Query } from '#shared/query';
import type { QueryState } from '#shared/query';

import { compileAndRunAqlQuery, runCompiledAqlQuery } from './exec';
import { schema, schemaConfig } from './schema';
import { schemaExecutors } from './schema/executors';
import type { CompilerState, SqlPieces } from './compiler';
import type { AqlQueryParams } from './exec';

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
