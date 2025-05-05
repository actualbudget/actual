// @ts-strict-ignore

import { aqlQuery } from '..';
import { q, QueryState } from '../../../shared/query';
import { CategoryEntity } from '../../../types/models';
import * as db from '../../db';
import { whereIn } from '../../db/util';
import {
  CompilerState,
  isAggregateQuery,
  OutputTypes,
  SqlPieces,
} from '../compiler';
import { AqlQueryExecutor, execQuery } from '../exec';
import { convertOutputType } from '../schema-helpers';

// Transactions executor

type SplitsOption = 'all' | 'inline' | 'none' | 'grouped';

function toGroup(parents, children, mapper = x => x) {
  return parents.reduce((list, parent) => {
    const childs = children.get(parent.id) || [];
    list.push({
      ...mapper(parent),
      subtransactions: childs.map(mapper),
    });
    return list;
  }, []);
}

// These two queries will return very different things:
//
// q('transactions').select({ $count: 'id' })
// q('transactions', { splits: "grouped" }).select({ $count: 'id' })
//
// The first will return the count of non-split and child
// transactions, and the second will return the count of all parent
// (or non-split) transactions

function execTransactions(
  compilerState: CompilerState,
  queryState: QueryState,
  sqlPieces: SqlPieces,
  params: (string | number)[],
  outputTypes: OutputTypes,
) {
  const tableOptions = queryState.tableOptions || {};
  const splitType = tableOptions.splits
    ? (tableOptions.splits as string)
    : 'inline';
  if (!isValidSplitsOption(splitType)) {
    throw new Error(`Invalid “splits” option for transactions: “${splitType}”`);
  }

  if (splitType === 'all' || splitType === 'inline' || splitType === 'none') {
    return execTransactionsBasic(
      compilerState,
      queryState,
      sqlPieces,
      params,
      splitType,
      outputTypes,
    );
  } else if (splitType === 'grouped') {
    return execTransactionsGrouped(
      compilerState,
      queryState,
      sqlPieces,
      params,
      outputTypes,
    );
  }
}

function _isUnhappy(filter) {
  // These fields can be filtered - all split transactions will
  // still be returned regardless
  for (const key of Object.keys(filter)) {
    if (key === '$or' || key === '$and') {
      if (filter[key] && _isUnhappy(filter[key])) {
        return true;
      }
    } else if (!(key.indexOf('account') === 0 || key === 'date')) {
      return true;
    }
  }
  return false;
}

export function isHappyPathQuery(queryState) {
  return queryState.filterExpressions.find(_isUnhappy) == null;
}

async function execTransactionsGrouped(
  compilerState: CompilerState,
  queryState: QueryState,
  sqlPieces: SqlPieces,
  params: (string | number)[],
  outputTypes: OutputTypes,
) {
  const { withDead } = queryState;
  const whereDead = withDead ? '' : `AND ${sqlPieces.from}.tombstone = 0`;

  // Aggregate queries don't make sense for a grouped transactions
  // query. We never should include both parent and children
  // transactions as it would duplicate amounts and the final number
  // would never make sense. In this case, switch back to the "inline"
  // type where only non-parent transactions are considered
  if (isAggregateQuery(queryState)) {
    const s = { ...sqlPieces };

    // Modify the where to only include non-parents
    s.where = `${s.where} AND ${s.from}.is_parent = 0`;

    // We also want to exclude deleted transactions. Normally we
    // handle this manually down below, but now that we are doing a
    // normal query we want to rely on the view. Unfortunately, SQL
    // has already been generated so we can't easily change the view
    // name here; instead, we change it and map it back to the name
    // used elsewhere in the query. Ideally we'd improve this
    if (!withDead) {
      s.from = 'v_transactions_internal_alive v_transactions_internal';
    }

    return execQuery(queryState, compilerState, s, params, outputTypes);
  }

  let rows;
  let matched = null;

  if (isHappyPathQuery(queryState)) {
    // This is just an optimization - we can just filter out children
    // directly and only list parents
    const rowSql = `
      SELECT ${sqlPieces.from}.id as group_id
      FROM ${sqlPieces.from}
      ${sqlPieces.joins}
      ${sqlPieces.where} AND is_child = 0 ${whereDead}
      ${sqlPieces.orderBy}
      ${sqlPieces.limit != null ? `LIMIT ${sqlPieces.limit}` : ''}
      ${sqlPieces.offset != null ? `OFFSET ${sqlPieces.offset}` : ''}
    `;
    rows = await db.all<db.DbViewTransactionInternal>(rowSql, params);
  } else {
    // TODO: phew, what a doozy. write docs why it works this way
    //
    // prettier-ignore
    const rowSql = `
      SELECT group_id, matched FROM (
        SELECT
          group_id,
          GROUP_CONCAT(id) as matched
          FROM (
            SELECT ${sqlPieces.from}.id, IFNULL(${sqlPieces.from}.parent_id, ${sqlPieces.from}.id) as group_id
            FROM ${sqlPieces.from}
            LEFT JOIN transactions _t2 ON ${sqlPieces.from}.is_child = 1 AND _t2.id = ${sqlPieces.from}.parent_id
            ${sqlPieces.joins}
            ${sqlPieces.where} AND ${sqlPieces.from}.tombstone = 0 AND IFNULL(_t2.tombstone, 0) = 0
          )
        GROUP BY group_id
      )
      LEFT JOIN ${sqlPieces.from} ON ${sqlPieces.from}.id = group_id
      ${sqlPieces.joins}
      ${sqlPieces.orderBy}
      ${sqlPieces.limit != null ? `LIMIT ${sqlPieces.limit}` : ''}
      ${sqlPieces.offset != null ? `OFFSET ${sqlPieces.offset}` : ''}
    `;

    rows = await db.all<db.DbViewTransactionInternal>(rowSql, params);
    matched = new Set(
      [].concat.apply(
        [],
        rows.map(row => row.matched.split(',')),
      ),
    );
  }

  const where = whereIn(
    rows.map(row => row.group_id),
    `IFNULL(${sqlPieces.from}.parent_id, ${sqlPieces.from}.id)`,
  );
  const finalSql = `
    SELECT ${sqlPieces.select}, parent_id AS _parent_id FROM ${sqlPieces.from}
    ${sqlPieces.joins}
    WHERE ${where} ${whereDead}
    ${sqlPieces.orderBy}
  `;

  const allRows = await db.all<
    db.DbViewTransactionInternal & {
      _parent_id: db.DbViewTransactionInternal['parent_id'];
    }
  >(finalSql);

  // Group the parents and children up
  const { parents, children } = allRows.reduce(
    (acc, trans) => {
      const pid = trans._parent_id;
      delete trans._parent_id;

      if (pid == null) {
        acc.parents.push(trans);
      } else {
        const arr = acc.children.get(pid) || [];
        arr.push(trans);
        acc.children.set(pid, arr);
      }
      return acc;
    },
    { parents: [], children: new Map() },
  );

  const mapper = trans => {
    Object.keys(trans).forEach(name => {
      trans[name] = convertOutputType(trans[name], outputTypes.get(name));
    });

    if (matched && !matched.has(trans.id)) {
      trans._unmatched = true;
    }
    return trans;
  };

  return toGroup(parents, children, mapper);
}

async function execTransactionsBasic(
  compilerState: CompilerState,
  queryState: QueryState,
  sqlPieces: SqlPieces,
  params: (string | number)[],
  splitType: SplitsOption,
  outputTypes: OutputTypes,
) {
  const s = { ...sqlPieces };

  if (splitType !== 'all') {
    if (splitType === 'none') {
      s.where = `${s.where} AND ${s.from}.parent_id IS NULL`;
    } else {
      s.where = `${s.where} AND ${s.from}.is_parent = 0`;
    }
  }

  return execQuery(queryState, compilerState, s, params, outputTypes);
}

function isValidSplitsOption(splits: string): splits is SplitsOption {
  return ['all', 'inline', 'none', 'grouped'].includes(splits);
}

// Category groups executor

type CategoriesOption = 'all' | 'none';

async function execCategoryGroups(
  compilerState: CompilerState,
  queryState: QueryState,
  sqlPieces: SqlPieces,
  params: (string | number)[],
  outputTypes: OutputTypes,
) {
  const tableOptions = queryState.tableOptions || {};
  const categoriesOption = tableOptions.categories
    ? (tableOptions.categories as string)
    : 'all';
  if (!isValidCategoriesOption(categoriesOption)) {
    throw new Error(
      `Invalid “categories” option for category_groups: “${categoriesOption}”`,
    );
  }

  if (categoriesOption !== 'none') {
    return execCategoryGroupsWithCategories(
      compilerState,
      queryState,
      sqlPieces,
      params,
      categoriesOption,
      outputTypes,
    );
  }
  return execCategoryGroupsBasic(
    compilerState,
    queryState,
    sqlPieces,
    params,
    outputTypes,
  );
}

async function execCategoryGroupsWithCategories(
  compilerState: CompilerState,
  queryState: QueryState,
  sqlPieces: SqlPieces,
  params: (string | number)[],
  categoriesOption: CategoriesOption,
  outputTypes: OutputTypes,
) {
  const categoryGroups = await execCategoryGroupsBasic(
    compilerState,
    queryState,
    sqlPieces,
    params,
    outputTypes,
  );

  if (categoriesOption === 'none') {
    return categoryGroups;
  }

  const { data: categories }: { data: CategoryEntity[] } = await aqlQuery(
    q('categories')
      .filter({
        group: { $oneof: categoryGroups.map(cg => cg.id) },
      })
      .select('*'),
  );

  return categoryGroups.map(group => {
    const cats = categories.filter(cat => cat.group === group.id);
    return {
      ...group,
      categories: cats,
    };
  });
}

async function execCategoryGroupsBasic(
  compilerState: CompilerState,
  queryState: QueryState,
  sqlPieces: SqlPieces,
  params: (string | number)[],
  outputTypes: OutputTypes,
) {
  return execQuery(queryState, compilerState, sqlPieces, params, outputTypes);
}

function isValidCategoriesOption(
  categories: string,
): categories is CategoriesOption {
  return ['all', 'none'].includes(categories);
}

export const schemaExecutors: Record<string, AqlQueryExecutor> = {
  transactions: execTransactions,
  category_groups: execCategoryGroups,
};
