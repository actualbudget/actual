import * as db from '../../db';
import { whereIn } from '../../db/util';
import { isAggregateQuery } from '../compiler';
import { execQuery } from '../exec';
import { convertOutputType } from '../schema-helpers';

// Transactions executor

function toGroup(parents, children, mapper = x => x) {
  return parents.reduce((list, parent) => {
    let childs = children.get(parent.id) || [];
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

function execTransactions(state, query, sql, params, outputTypes) {
  let tableOptions = query.tableOptions || {};
  let splitType = tableOptions.splits || 'inline';

  if (['all', 'inline', 'none', 'grouped'].indexOf(splitType) === -1) {
    throw new Error(`Invalid “splits” option for transactions: “${splitType}”`);
  }

  if (splitType === 'all' || splitType === 'inline' || splitType === 'none') {
    return execTransactionsBasic(
      state,
      query,
      sql,
      params,
      splitType,
      outputTypes,
    );
  } else if (splitType === 'grouped') {
    return execTransactionsGrouped(
      state,
      query,
      sql,
      params,
      splitType,
      outputTypes,
    );
  }
}

function _isUnhappy(filter) {
  // These fields can be filtered - all split transactions will
  // still be returned regardless
  for (let key of Object.keys(filter)) {
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
  state,
  queryState,
  sql,
  params,
  splitType,
  outputTypes,
) {
  let { withDead } = queryState;
  let whereDead = withDead ? '' : `AND ${sql.from}.tombstone = 0`;

  // Aggregate queries don't make sense for a grouped transactions
  // query. We never should include both parent and children
  // transactions as it would duplicate amounts and the final number
  // would never make sense. In this case, switch back to the "inline"
  // type where only non-parent transactions are considered
  if (isAggregateQuery(queryState)) {
    let s = { ...sql };

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

    return execQuery(queryState, state, s, params, outputTypes);
  }

  let rows;
  let matched = null;

  if (isHappyPathQuery(queryState)) {
    // This is just an optimization - we can just filter out children
    // directly and only list parents
    let rowSql = `
      SELECT ${sql.from}.id as group_id
      FROM ${sql.from}
      ${sql.joins}
      ${sql.where} AND is_child = 0 ${whereDead}
      ${sql.orderBy}
      ${sql.limit != null ? `LIMIT ${sql.limit}` : ''}
      ${sql.offset != null ? `OFFSET ${sql.offset}` : ''}
    `;
    rows = await db.all(rowSql, params);
  } else {
    // TODO: phew, what a doozy. write docs why it works this way
    //
    // prettier-ignore
    let rowSql = `
      SELECT group_id, matched FROM (
        SELECT
          group_id,
          GROUP_CONCAT(id) as matched
          FROM (
            SELECT ${sql.from}.id, IFNULL(${sql.from}.parent_id, ${sql.from}.id) as group_id
            FROM ${sql.from}
            LEFT JOIN transactions _t2 ON ${sql.from}.is_child = 1 AND _t2.id = ${sql.from}.parent_id
            ${sql.joins}
            ${sql.where} AND ${sql.from}.tombstone = 0 AND IFNULL(_t2.tombstone, 0) = 0
          )
        GROUP BY group_id
      )
      LEFT JOIN ${sql.from} ON ${sql.from}.id = group_id
      ${sql.joins}
      ${sql.orderBy}
      ${sql.limit != null ? `LIMIT ${sql.limit}` : ''}
      ${sql.offset != null ? `OFFSET ${sql.offset}` : ''}
    `;

    rows = await db.all(rowSql, params);
    matched = new Set(
      [].concat.apply(
        [],
        rows.map(row => row.matched.split(',')),
      ),
    );
  }

  let where = whereIn(
    rows.map(row => row.group_id),
    `IFNULL(${sql.from}.parent_id, ${sql.from}.id)`,
  );
  let finalSql = `
    SELECT ${sql.select}, parent_id AS _parent_id FROM ${sql.from}
    ${sql.joins}
    WHERE ${where} ${whereDead}
    ${sql.orderBy}
  `;

  let allRows = await db.all(finalSql);

  // Group the parents and children up
  let { parents, children } = allRows.reduce(
    (acc, trans) => {
      let pid = trans._parent_id;
      delete trans._parent_id;

      if (pid == null) {
        acc.parents.push(trans);
      } else {
        let arr = acc.children.get(pid) || [];
        arr.push(trans);
        acc.children.set(pid, arr);
      }
      return acc;
    },
    { parents: [], children: new Map() },
  );

  let mapper = trans => {
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
  state,
  queryState,
  sql,
  params,
  splitType,
  outputTypes,
) {
  let s = { ...sql };

  if (splitType !== 'all') {
    if (splitType === 'none') {
      s.where = `${s.where} AND ${s.from}.parent_id IS NULL`;
    } else {
      s.where = `${s.where} AND ${s.from}.is_parent = 0`;
    }
  }

  return execQuery(queryState, state, s, params, outputTypes);
}

export const schemaExecutors = {
  transactions: execTransactions,
};
