// @ts-strict-ignore
import * as db from '../db';

import { compileQuery, defaultConstructQuery } from './compiler';
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

function applyTypes(data, outputTypes) {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    Object.keys(item).forEach(name => {
      item[name] = convertOutputType(item[name], outputTypes.get(name));
    });
  }
}

export async function execQuery(
  queryState,
  state,
  sqlPieces,
  params,
  outputTypes,
) {
  const sql = defaultConstructQuery(queryState, state, sqlPieces);
  const data = await db.all(sql, params);
  applyTypes(data, outputTypes);
  return data;
}

/**
 * The run pre-compiled AQL query.
 * @param query The pre-compiled AQL query.
 * @param pieces The compiled SQL pieces.
 * @param state The query state.
 * @param options The query options.
 * @returns The queried data.
 */
export async function runCompiledQuery(
  query,
  pieces,
  state,
  { params = {}, executors = {} } = {},
) {
  const paramArray = state.namedParameters.map(param => {
    const name = param.paramName;
    if (params[name] === undefined) {
      throw new Error(`Parameter ${name} not provided to query`);
    }
    return convertInputType(params[name], param.paramType);
  });

  let data;
  if (executors[state.implicitTableName]) {
    data = await executors[state.implicitTableName](
      state,
      query,
      pieces,
      paramArray,
      state.outputTypes,
    );
  } else {
    data = await execQuery(query, state, pieces, paramArray, state.outputTypes);
  }

  if (query.calculation) {
    if (data.length > 0) {
      const row = data[0];
      const k = Object.keys(row)[0];
      // TODO: the function being run should be the one to
      // determine the default value, not hardcoded as 0
      data = row[k] || 0;
    } else {
      data = null;
    }
  }
  return data;
}

/**
 * Compile and run the AQL query.
 * @param schema The schema.
 * @param schemaConfig The schema configuration.
 * @param query The AQL query.
 * @param options The query options.
 * @returns The queried data and its dependencies.
 */
export async function runQuery(schema, schemaConfig, query, options) {
  const { sqlPieces, state } = compileQuery(query, schema, schemaConfig);
  const data = await runCompiledQuery(query, sqlPieces, state, options);
  return { data, dependencies: state.dependencies };
}
