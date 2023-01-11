import * as nodes from './nodes';

let _uid = 0;
function resetUid() {
  _uid = 0;
}

function uid() {
  _uid++;
  return 't' + _uid;
}

function fail(node, message) {
  const err = new Error(message);
  err.node = node;
  throw err;
}

function generateExpression(expr) {
  if (typeof expr === 'string') {
    return '"' + expr + '"';
  } else if (typeof expr === 'number') {
    return expr;
  }

  switch (expr.getTypeName()) {
    case 'FunCall':
      return (
        generateExpression(expr.callee) +
        '(' +
        expr.args.children.map(node => generateExpression(node)).join(',') +
        ')'
      );
    case 'Member':
      return (
        generateExpression(expr.object) +
        '.' +
        generateExpression(expr.property)
      );
    case 'BinOp':
      const left = generateExpression(expr.left);
      let str;

      if (
        expr.op === '=' &&
        expr.right.getTypeName() === 'Symbol' &&
        expr.right.value === 'null'
      ) {
        str = left + ' IS NULL';
      } else {
        const right = generateExpression(expr.right);

        switch (expr.op) {
          case '=~':
            str = `${left} LIKE ${right}`;
            break;
          case '!=~':
            str = `${left} NOT LIKE ${right}`;
            break;
          default:
            str = `${left} ${expr.op} ${right}`;
        }
      }

      return '(' + str + ')';
    case 'Literal':
      if (typeof expr.value === 'string') {
        return '"' + expr.value + '"';
      }
      return expr.value;
    case 'Symbol':
      // if (expr.value.indexOf('!') !== -1) {
      //   fail(expr, 'SQL variable cannot contain cell lookup');
      // }
      return expr.value;
    default:
      throw new Error('Unknown query node: ' + expr.getTypeName());
  }
}

function transformColumns(node, implicitTable) {
  let transformed = node.traverse(n => {
    if (n instanceof nodes.Symbol) {
      let table = implicitTable;
      let field = n.value;

      if (SCHEMA_PATHS[table] && SCHEMA_PATHS[table][field]) {
        let info = SCHEMA_PATHS[table][field];
        if (info.field) {
          // Map the field onto something else
          return new nodes.Symbol(n.lineno, n.colno, info.field);
        }
      }
    }
  });

  return transformed || node;
}

function transformLookups(node, implicitTable) {
  let paths = [];

  const transformed = node.traverse(n => {
    if (n instanceof nodes.Member) {
      let currentNode = n;

      let lookups = [];
      while (currentNode instanceof nodes.Member) {
        if (!(currentNode.property instanceof nodes.Value)) {
          fail(currentNode, 'Invalid syntax for SQL reference');
        }

        lookups.push({ field: currentNode.property.value });
        currentNode = currentNode.object;
      }

      if (!(currentNode instanceof nodes.Symbol)) {
        fail(currentNode, 'Invalid syntax for SQL reference');
      }
      lookups.push({ field: currentNode.value });
      lookups.reverse();

      lookups = lookups.map((lookup, idx) => {
        return {
          field: lookup.field,
          tableId: uid()
        };
      });

      let table = implicitTable;

      // Skip the last field as we don't want to resolve to that
      // table. The syntax to emit is `table.field`.
      for (let i = 0; i < lookups.length - 1; i++) {
        const lookup = lookups[i];

        if (!SCHEMA_PATHS[table]) {
          const err = new Error(
            `Table "${table}" not joinable for field "${lookup}"`
          );
          err.node = node;
          throw err;
        }
        if (!SCHEMA_PATHS[table][lookup.field]) {
          const err = new Error(
            `Unknown field "${lookup}" on table "${table}"`
          );
          err.node = node;
          throw err;
        }

        table = SCHEMA_PATHS[table][lookup.field].table;
      }

      paths.push(lookups);

      let tableId = lookups[lookups.length - 2].tableId;
      let field = lookups[lookups.length - 1].field;

      return new nodes.Member(
        node.lineno,
        node.colno,
        new nodes.Symbol(node.lineno, node.colno, tableId),
        new nodes.Symbol(node.lineno, node.colno, field)
      );
    }
  });

  return { paths, node: transformed || node };
}

export default function generate(table, where, groupby, select, deps) {
  // Figure out the dep tables here. Return the SQL and dependent
  // tables
  let allPaths = [];

  resetUid();

  if (!tables[table]) {
    throw new Error('Table not found: ' + table);
  }

  const selectStr = select
    .map(s => {
      let { paths, node } = transformLookups(s.expr, table);
      let as = s.as;
      allPaths = allPaths.concat(paths);

      let newNode = transformColumns(node, table);

      // If the selected field was transformed, select it as the
      // original name
      if (node !== newNode && node instanceof nodes.Symbol && !as) {
        as = node.value;
      }

      const exprStr = generateExpression(newNode);
      return as ? `${exprStr} as ${as}` : exprStr;
    })
    .join(', ');

  let whereStr = '';
  let whereTransformed;
  if (where) {
    let { paths, node } = transformLookups(where, table);
    allPaths = allPaths.concat(paths);
    whereTransformed = node.copy();

    // Where clauses provide a special hook to map a column onto
    // something different, so you can represent something more
    // complex internally. You are still required to provide the
    // original name somehow; all other references use the original
    // name, so make sure you do `JOIN table <original-name>` or
    // something like that.
    node = transformColumns(node, table);

    whereStr = ' WHERE (' + generateExpression(node) + ')';
  }

  let groupByStr = '';
  if (groupby) {
    let { paths, node } = transformLookups(groupby, table);
    allPaths = allPaths.concat(paths);
    groupByStr = ' GROUP BY ' + generateExpression(node);
  }

  let dependencies = [];
  let joins = [];

  allPaths.forEach(path => {
    let currentTable = { name: table, id: table };
    for (var i = 0; i < path.length - 1; i++) {
      let lookup = path[i];
      let meta = SCHEMA_PATHS[currentTable.name][lookup.field];

      if (meta.sql) {
        joins.push(meta.sql(lookup.tableId));
      } else {
        joins.push(
          `LEFT JOIN ${meta.table} ${lookup.tableId} ON ${lookup.tableId}.id = ${currentTable.id}.${lookup.field}`
        );
      }

      if (dependencies.indexOf(meta.table) === -1) {
        dependencies.push(meta.table);
      }

      currentTable = { name: meta.table, id: lookup.tableId };
    }
  });

  const sql =
    tables[table](selectStr, whereStr, joins.join('\n')) + ' ' + groupByStr;

  return {
    sql,
    where: whereTransformed,
    dependencies
  };
}

export const SCHEMA_PATHS = {
  transactions: {
    category: {
      table: 'categories',
      sql: id => `LEFT JOIN categories ${id} ON __cm.transferId = ${id}.id`,
      field: '__cm.transferId'
    },
    acct: { table: 'accounts' },
    description: { table: 'payees' }
  },
  payees: {
    transfer_acct: { table: 'accounts' }
  },
  accounts: {
    bank: { table: 'banks' }
  }
};

const tables = {
  transactions: (select, where, join) => {
    // Never take into account parent split transactions. Their
    // children should sum up to be equal to it
    // prettier-ignore
    let whereStr = `${where === '' ? 'WHERE' : where + ' AND'} transactions.isParent = 0 AND transactions.tombstone = 0`;

    return `
      SELECT ${select} FROM transactions
      LEFT JOIN category_mapping __cm ON __cm.id = transactions.category
      ${join}
      ${whereStr}
    `;
  }
};
