// @ts-strict-ignore
import { QueryState } from '../../shared/query';
import * as db from '../db';

import {
  compileQuery,
  CompilerState,
  defaultConstructQuery,
  OutputTypes,
  SchemaConfig,
  SqlPieces,
} from './compiler';
import { convertInputType, convertOutputType } from './schema-helpers';

// TODO (compiler):
// * Properly safeguard all inputs against SQL injection
// * Functions for incr/decr dates
// * Support HAVING
// * Allow creating in-memory tables to run queries against static
//   data
// * For aggregate functions on selected ids, manually implement
//   them only only support a specific few (sum amount / etc)
// * Select expressions should be evaluated first, and added to a
//   global "field lookup" table that other filter/groupBy/etc
//   expressions can reference

function applyTypes(data: Record<string, unknown>[], outputTypes: OutputTypes) {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    Object.keys(item).forEach(name => {
      item[name] = convertOutputType(item[name], outputTypes.get(name));
    });
  }
}

export async function execQuery(
  queryState: QueryState,
  compilerState: CompilerState,
  sqlPieces: SqlPieces,
  params: (string | number)[],
  outputTypes: OutputTypes,
) {
  const sql = defaultConstructQuery(queryState, compilerState, sqlPieces);
  const data = await db.all<Record<string, unknown>>(sql, params);
  applyTypes(data, outputTypes);
  return data;
}

export type AqlQueryExecutor = (
  compilerState: CompilerState,
  queryState: QueryState,
  sqlPieces: SqlPieces,
  params: (string | number)[],
  outputTypes: OutputTypes,
) => Promise<Record<string, unknown>[]>;

type AqlQueryParamName = string;
type AqlQueryParamValue = unknown;
export type AqlQueryParams = Record<AqlQueryParamName, AqlQueryParamValue>;

export type RunCompiledAqlQueryOptions = {
  params?: AqlQueryParams;
  executors?: Record<string, AqlQueryExecutor>;
};

export async function runCompiledAqlQuery(
  queryState: QueryState,
  sqlPieces: SqlPieces,
  compilerState: CompilerState,
  { params = {}, executors = {} }: RunCompiledAqlQueryOptions = {},
) {
  const paramArray = compilerState.namedParameters.map(param => {
    const name = param.paramName;
    if (params[name] === undefined) {
      throw new Error(`Parameter ${name} not provided to query`);
    }
    return convertInputType(params[name], param.paramType);
  });

  let data: Record<string, unknown>[] = [];
  if (executors[compilerState.implicitTableName]) {
    data = await executors[compilerState.implicitTableName](
      compilerState,
      queryState,
      sqlPieces,
      paramArray,
      compilerState.outputTypes,
    );
  } else {
    data = await execQuery(
      queryState,
      compilerState,
      sqlPieces,
      paramArray,
      compilerState.outputTypes,
    );
  }

  if (queryState.calculation) {
    if (data.length > 0) {
      const row = data[0];
      const k = Object.keys(row)[0];
      // TODO: the function being run should be the one to
      // determine the default value, not hardcoded as 0
      return row[k] || 0;
    } else {
      return null;
    }
  }

  return data;
}

export async function compileAndRunAqlQuery(
  schema,
  schemaConfig: SchemaConfig,
  queryState: QueryState,
  options: RunCompiledAqlQueryOptions,
) {
  const { sqlPieces, state } = compileQuery(queryState, schema, schemaConfig);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await runCompiledAqlQuery(
    queryState,
    sqlPieces,
    state,
    options,
  );
  return { data, dependencies: state.dependencies };
}
