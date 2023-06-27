let _uid = 0;
function resetUid() {
  _uid = 0;
}

function uid(tableName) {
  _uid++;
  return tableName + _uid;
}

class CompileError extends Error {}

function nativeDateToInt(date) {
  let pad = x => (x < 10 ? '0' : '') + x;
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
}

function dateToInt(date) {
  return parseInt(date.replace(/-/g, ''));
}

function addTombstone(schema, tableName, tableId, whereStr) {
  let hasTombstone = schema[tableName].tombstone != null;
  return hasTombstone ? `${whereStr} AND ${tableId}.tombstone = 0` : whereStr;
}

function popPath(path) {
  let parts = path.split('.');
  return { path: parts.slice(0, -1).join('.'), field: parts[parts.length - 1] };
}

function isKeyword(str) {
  return str === 'group';
}

export function quoteAlias(alias) {
  // eslint-disable-next-line rulesdir/typography
  return alias.indexOf('.') === -1 && !isKeyword(alias) ? alias : `"${alias}"`;
}

function typed(value, type, { literal = false } = {}) {
  return { value, type, literal };
}

function getFieldDescription(schema, tableName, field) {
  if (schema[tableName] == null) {
    throw new CompileError(`Table “${tableName}” does not exist in the schema`);
  }

  let fieldDesc = schema[tableName][field];
  if (fieldDesc == null) {
    throw new CompileError(
      `Field “${field}” does not exist in table “${tableName}”`,
    );
  }
  return fieldDesc;
}

function makePath(state, path) {
  let { schema, paths } = state;

  let parts = path.split('.');
  if (parts.length < 2) {
    throw new CompileError('Invalid path: ' + path);
  }

  let initialTable = parts[0];

  let tableName = parts.slice(1).reduce((tableName, field) => {
    let table = schema[tableName];

    if (table == null) {
      throw new CompileError(`Path error: ${tableName} table does not exist`);
    }

    if (!table[field] || table[field].ref == null) {
      throw new CompileError(
        `Field not joinable on table ${tableName}: “${field}”`,
      );
    }

    return table[field].ref;
  }, initialTable);

  let joinTable;
  let parentParts = parts.slice(0, -1);
  if (parentParts.length === 1) {
    joinTable = parentParts[0];
  } else {
    let parentPath = parentParts.join('.');
    let parentDesc = paths.get(parentPath);
    if (!parentDesc) {
      throw new CompileError('Path does not exist: ' + parentPath);
    }
    joinTable = parentDesc.tableId;
  }

  return {
    tableName: tableName,
    tableId: uid(tableName),
    joinField: parts[parts.length - 1],
    joinTable,
  };
}

function resolvePath(state, path) {
  let paths = path.split('.');

  paths = paths.reduce(
    (acc, name) => {
      let fullName = acc.context + '.' + name;
      return {
        context: fullName,
        path: [...acc.path, fullName],
      };
    },
    { context: state.implicitTableName, path: [] },
  ).path;

  paths.forEach(path => {
    if (!state.paths.get(path)) {
      state.paths.set(path, makePath(state, path));
    }
  });

  let pathInfo = state.paths.get(paths[paths.length - 1]);
  return pathInfo;
}

function transformField(state, name) {
  if (typeof name !== 'string') {
    throw new CompileError('Invalid field name, must be a string');
  }

  let { path, field } = popPath(name);

  let pathInfo;
  if (path === '') {
    pathInfo = {
      tableName: state.implicitTableName,
      tableId: state.implicitTableId,
    };
  } else {
    pathInfo = resolvePath(state, path);
  }

  let fieldDesc = getFieldDescription(state.schema, pathInfo.tableName, field);

  // If this is a field that references an item in another table, that
  // item could have been deleted. If that's the case, we want to
  // return `null` instead of an id pointing to a deleted item. This
  // converts an id reference into a path that pulls the id through a
  // table join which will filter out dead items, resulting in a
  // `null` id if the item is deleted
  if (
    state.validateRefs &&
    fieldDesc.ref &&
    fieldDesc.type === 'id' &&
    field !== 'id'
  ) {
    let refPath = state.implicitTableName + '.' + name;
    let refPathInfo = state.paths.get(refPath);

    if (!refPathInfo) {
      refPathInfo = makePath(state, refPath);
      refPathInfo.noMapping = true;
      state.paths.set(refPath, refPathInfo);
    }

    field = 'id';
    pathInfo = refPathInfo;
  }

  let fieldStr = pathInfo.tableId + '.' + field;
  return typed(fieldStr, fieldDesc.type);
}

function parseDate(str) {
  let m = str.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (m) {
    return typed(dateToInt(m[1]), 'date', { literal: true });
  }
  return null;
}

function parseMonth(str) {
  let m = str.match(/^(\d{4}-\d{2})$/);
  if (m) {
    return typed(dateToInt(m[1]), 'date', { literal: true });
  }
  return null;
}

function parseYear(str) {
  let m = str.match(/^(\d{4})$/);
  if (m) {
    return typed(dateToInt(m[1]), 'date', { literal: true });
  }
  return null;
}

function badDateFormat(str, type) {
  throw new CompileError(`Bad ${type} format: ${str}`);
}

function inferParam(param, type) {
  let existingType = param.paramType;
  if (existingType) {
    let casts = {
      date: ['string'],
      'date-month': ['date'],
      'date-year': ['date', 'date-month'],
      id: ['string'],
      float: ['integer'],
    };

    if (
      existingType !== type &&
      (!casts[type] || !casts[type].includes(existingType))
    ) {
      throw new Error(
        `Parameter “${param.paramName}” can’t convert to ${type} (already inferred as ${existingType})`,
      );
    }
  } else {
    param.paramType = type;
  }
}

function castInput(state, expr, type) {
  if (expr.type === type) {
    return expr;
  } else if (expr.type === 'param') {
    inferParam(expr, type);
    return typed(expr.value, type);
  } else if (expr.type === 'null') {
    if (!expr.literal) {
      throw new CompileError('A non-literal null doesn’t make sense');
    }

    if (type === 'boolean') {
      return typed(0, 'boolean', { literal: true });
    }
    return expr;
  }

  // These are all things that can be safely casted automatically
  if (type === 'date') {
    if (expr.type === 'string') {
      if (expr.literal) {
        return parseDate(expr.value) || badDateFormat(expr.value, 'date');
      } else {
        throw new CompileError(
          'Casting string fields to dates is not supported',
        );
      }
    }

    throw new CompileError(`Can’t cast ${expr.type} to date`);
  } else if (type === 'date-month') {
    let expr2;
    if (expr.type === 'date') {
      expr2 = expr;
    } else if (expr.type === 'string' || expr.type === 'any') {
      expr2 =
        parseMonth(expr.value) ||
        parseDate(expr.value) ||
        badDateFormat(expr.value, 'date-month');
    } else {
      throw new CompileError(`Can’t cast ${expr.type} to date-month`);
    }

    if (expr2.literal) {
      return typed(
        dateToInt(expr2.value.toString().slice(0, 6)),
        'date-month',
        { literal: true },
      );
    } else {
      return typed(
        `CAST(SUBSTR(${expr2.value}, 1, 6) AS integer)`,
        'date-month',
      );
    }
  } else if (type === 'date-year') {
    let expr2;
    if (expr.type === 'date' || expr.type === 'date-month') {
      expr2 = expr;
    } else if (expr.type === 'string') {
      expr2 =
        parseYear(expr.value) ||
        parseMonth(expr.value) ||
        parseDate(expr.value) ||
        badDateFormat(expr.value, 'date-year');
    } else {
      throw new CompileError(`Can’t cast ${expr.type} to date-year`);
    }

    if (expr2.literal) {
      return typed(dateToInt(expr2.value.toString().slice(0, 4)), 'date-year', {
        literal: true,
      });
    } else {
      return typed(
        `CAST(SUBSTR(${expr2.value}, 1, 4) AS integer)`,
        'date-year',
      );
    }
  } else if (type === 'id') {
    if (expr.type === 'string') {
      return typed(expr.value, 'id', { literal: expr.literal });
    }
  } else if (type === 'float') {
    if (expr.type === 'integer') {
      return typed(expr.value, 'float', { literal: expr.literal });
    }
  }

  if (expr.type === 'any') {
    return typed(expr.value, type, { literal: expr.literal });
  }

  throw new CompileError(`Can’t convert ${expr.type} to ${type}`);
}

// TODO: remove state from these functions
function val(state, expr, type?: string) {
  let castedExpr = expr;

  // Cast the type if necessary
  if (type) {
    castedExpr = castInput(state, expr, type);
  }

  if (castedExpr.literal) {
    /* eslint-disable rulesdir/typography */
    if (castedExpr.type === 'id') {
      return `'${castedExpr.value}'`;
    } else if (castedExpr.type === 'string') {
      // Escape quotes
      let value = castedExpr.value.replace(/'/g, "''");
      return `'${value}'`;
    }
    /* eslint-enable rulesdir/typography */
  }

  return castedExpr.value;
}

function valArray(state, arr: unknown[], types?: string[]) {
  return arr.map((value, idx) => val(state, value, types ? types[idx] : null));
}

function validateArgLength(arr: unknown[], min: number, max?: number) {
  if (max == null) {
    max = min;
  }

  if (min != null && arr.length < min) {
    throw new CompileError('Too few arguments');
  }
  if (max != null && arr.length > max) {
    throw new CompileError('Too many arguments');
  }
}

//// Nice errors

function saveStack(type, func) {
  return (state, ...args) => {
    if (state == null || state.compileStack == null) {
      throw new CompileError(
        'This function cannot track error data. ' +
          'It needs to accept the compiler state as the first argument.',
      );
    }

    state.compileStack.push({ type, args });
    let ret = func(state, ...args);
    state.compileStack.pop();
    return ret;
  };
}

function prettyValue(value) {
  if (typeof value === 'string') {
    return value;
  } else if (value === undefined) {
    return 'undefined';
  }

  let str = JSON.stringify(value);
  if (str.length > 70) {
    let expanded = JSON.stringify(value, null, 2);
    return expanded.split('\n').join('\n  ');
  }
  return str;
}

function getCompileError(error, stack) {
  if (stack.length === 0) {
    return error;
  }

  let stackStr = stack
    .slice(1)
    .reverse()
    .map(entry => {
      switch (entry.type) {
        case 'expr':
        case 'function':
          return prettyValue(entry.args[0]);
        case 'op': {
          let [fieldRef, opData] = entry.args;
          return prettyValue({ [fieldRef]: opData });
        }
        case 'value':
          return prettyValue(entry.value);
        default:
          return '';
      }
    })
    .map(str => '\n  ' + str)
    .join('');

  const rootMethod = stack[0].type;
  const methodArgs = stack[0].args[0];
  stackStr += `\n  ${rootMethod}(${prettyValue(
    methodArgs.length === 1 ? methodArgs[0] : methodArgs,
  )})`;

  // In production, hide internal stack traces
  if (process.env.NODE_ENV === 'production') {
    const err = new CompileError();
    err.message = `${error.message}\n\nExpression stack:` + stackStr;
    err.stack = null;
    return err;
  }

  error.message = `${error.message}\n\nExpression stack:` + stackStr;
  return error;
}

//// Compiler

function compileLiteral(value) {
  if (value === undefined) {
    throw new CompileError('`undefined` is not a valid query value');
  } else if (value === null) {
    return typed('NULL', 'null', { literal: true });
  } else if (value instanceof Date) {
    return typed(nativeDateToInt(value), 'date', { literal: true });
  } else if (typeof value === 'string') {
    // Allow user to escape $, and quote the string to make it a
    // string literal in the output
    value = value.replace(/\\\$/g, '$');
    return typed(value, 'string', { literal: true });
  } else if (typeof value === 'boolean') {
    return typed(value ? 1 : 0, 'boolean', { literal: true });
  } else if (typeof value === 'number') {
    return typed(value, Number.isInteger(value) ? 'integer' : 'float', {
      literal: true,
    });
  } else if (Array.isArray(value)) {
    return typed(value, 'array', { literal: true });
  } else {
    throw new CompileError(
      'Unsupported type of expression: ' + JSON.stringify(value),
    );
  }
}

const compileExpr = saveStack('expr', (state, expr) => {
  if (typeof expr === 'string') {
    // Field reference
    if (expr[0] === '$') {
      let fieldRef = expr === '$' ? state.implicitField : expr.slice(1);

      if (fieldRef == null || fieldRef === '') {
        throw new CompileError('Invalid field reference: ' + expr);
      }

      return transformField(state, fieldRef);
    }

    // Named parameter
    if (expr[0] === ':') {
      let param = { value: '?', type: 'param', paramName: expr.slice(1) };
      state.namedParameters.push(param);
      return param;
    }
  }

  if (expr !== null) {
    if (Array.isArray(expr)) {
      return compileLiteral(expr);
    } else if (
      typeof expr === 'object' &&
      Object.keys(expr).find(k => k[0] === '$')
    ) {
      // It's a function call
      return compileFunction(state, expr);
    }
  }

  return compileLiteral(expr);
});

const compileFunction = saveStack('function', (state, func) => {
  let [name] = Object.keys(func);
  let argExprs = func[name];
  if (!Array.isArray(argExprs)) {
    argExprs = [argExprs];
  }

  if (name[0] !== '$') {
    throw new CompileError(
      `Unknown property “${name}.” Did you mean to call a function? Try prefixing it with $`,
    );
  }

  let args = argExprs;
  // `$condition` is a special-case where it will be evaluated later
  if (name !== '$condition') {
    args = argExprs.map(arg => compileExpr(state, arg));
  }

  switch (name) {
    // aggregate functions
    case '$sum': {
      validateArgLength(args, 1);
      let [arg1] = valArray(state, args, ['float']);
      return typed(`SUM(${arg1})`, args[0].type);
    }

    case '$sumOver': {
      let [arg1] = valArray(state, args, ['float']);
      let order = state.orders
        ? 'ORDER BY ' + compileOrderBy(state, state.orders)
        : '';

      return typed(
        `(SUM(${arg1}) OVER (${order} ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING))`,
        args[0].type,
      );
    }

    case '$count': {
      validateArgLength(args, 1);
      let [arg1] = valArray(state, args);
      return typed(`COUNT(${arg1})`, 'integer');
    }

    // string functions
    case '$substr': {
      validateArgLength(args, 2, 3);
      let [arg1, arg2, arg3] = valArray(state, args, [
        'string',
        'integer',
        'integer',
      ]);
      return typed(`SUBSTR(${arg1}, ${arg2}, ${arg3})`, 'string');
    }
    case '$lower': {
      validateArgLength(args, 1);
      let [arg1] = valArray(state, args, ['string']);
      return typed(`UNICODE_LOWER(${arg1})`, 'string');
    }

    // integer/float functions
    case '$neg': {
      validateArgLength(args, 1);
      valArray(state, args, ['float']);
      return typed(`(-${val(state, args[0])})`, args[0].type);
    }
    case '$abs': {
      validateArgLength(args, 1);
      valArray(state, args, ['float']);
      return typed(`ABS(${val(state, args[0])})`, args[0].type);
    }
    case '$idiv': {
      validateArgLength(args, 2);
      valArray(state, args, ['integer', 'integer']);
      return typed(
        `(${val(state, args[0])} / ${val(state, args[1])})`,
        args[0].type,
      );
    }

    // date functions
    case '$month': {
      validateArgLength(args, 1);
      return castInput(state, args[0], 'date-month');
    }
    case '$year': {
      validateArgLength(args, 1);
      return castInput(state, args[0], 'date-year');
    }

    // various functions
    case '$condition':
      validateArgLength(args, 1);
      let conds = compileConditions(state, args[0]);
      return typed(conds.join(' AND '), 'boolean');

    case '$nocase':
      validateArgLength(args, 1);
      let [arg1] = valArray(state, args, ['string']);
      return typed(`${arg1} COLLATE NOCASE`, args[0].type);

    case '$literal': {
      validateArgLength(args, 1);
      if (!args[0].literal) {
        throw new CompileError('Literal not passed to $literal');
      }
      return args[0];
    }
    default:
      throw new CompileError(`Unknown function: ${name}`);
  }
});

const compileOp = saveStack('op', (state, fieldRef, opData) => {
  let { $transform, ...opExpr } = opData;
  let [op] = Object.keys(opExpr);

  let rhs = compileExpr(state, opData[op]);

  let lhs;
  if ($transform) {
    lhs = compileFunction(
      { ...state, implicitField: fieldRef },
      typeof $transform === 'string' ? { [$transform]: '$' } : $transform,
    );
  } else {
    lhs = compileExpr(state, '$' + fieldRef);
  }

  switch (op) {
    case '$gte': {
      let [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      return `${left} >= ${right}`;
    }
    case '$lte': {
      let [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      return `${left} <= ${right}`;
    }
    case '$gt': {
      let [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      return `${left} > ${right}`;
    }
    case '$lt': {
      let [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      return `${left} < ${right}`;
    }
    case '$eq': {
      if (castInput(state, rhs, lhs.type).type === 'null') {
        return `${val(state, lhs)} IS NULL`;
      }

      let [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);

      if (rhs.type === 'param') {
        let orders = state.namedParameters.map(param => {
          return param === rhs || param === lhs ? [param, { ...param }] : param;
        });
        state.namedParameters = [].concat.apply([], orders);

        return `CASE
          WHEN ${left} IS NULL THEN ${right} IS NULL
          ELSE ${left} = ${right}
        END`;
      }

      return `${left} = ${right}`;
    }
    case '$oneof': {
      let [left, right] = valArray(state, [lhs, rhs], [null, 'array']);
      // Dedupe the ids
      let ids = [...new Set(right)];
      // eslint-disable-next-line rulesdir/typography
      return `${left} IN (` + ids.map(id => `'${id}'`).join(',') + ')';
    }
    case '$like': {
      let [left, right] = valArray(state, [lhs, rhs], ['string', 'string']);
      return `${left} LIKE ${right}`;
    }
    default:
      throw new CompileError(`Unknown operator: ${op}`);
  }
});

function compileConditions(state, conds) {
  if (!Array.isArray(conds)) {
    // Convert the object form `{foo: 1, bar:2}` into the array form
    // `[{foo: 1}, {bar:2}]`
    conds = Object.entries(conds).map(cond => {
      return { [cond[0]]: cond[1] };
    });
  }

  return conds.filter(Boolean).reduce((res, condsObj) => {
    let compiled = Object.entries(condsObj)
      .map(([field, cond]) => {
        // Allow a falsy value in the lhs of $and and $or to allow for
        // quick forms like `$or: amount != 0 && ...`
        if (field === '$and') {
          if (!cond) {
            return null;
          }
          return compileAnd(state, cond);
        } else if (field === '$or') {
          if (!cond) {
            return null;
          }
          return compileOr(state, cond);
        }

        if (
          typeof cond === 'string' ||
          typeof cond === 'number' ||
          typeof cond === 'boolean' ||
          cond instanceof Date ||
          cond == null
        ) {
          return compileOp(state, field, { $eq: cond });
        }

        if (Array.isArray(cond)) {
          // An array of conditions for a field is implicitly an `and`
          return cond.map(c => compileOp(state, field, c)).join(' AND ');
        }
        return compileOp(state, field, cond);
      })
      .filter(Boolean);

    return [...res, ...compiled];
  }, []);
}

function compileOr(state, conds) {
  // Same as above
  if (!conds) {
    return '0';
  }
  let res = compileConditions(state, conds);
  if (res.length === 0) {
    return '0';
  }
  return '(' + res.join('\n  OR ') + ')';
}

function compileAnd(state, conds) {
  // Same as above
  if (!conds) {
    return '1';
  }
  let res = compileConditions(state, conds);
  if (res.length === 0) {
    return '1';
  }
  return '(' + res.join('\n  AND ') + ')';
}

const compileWhere = saveStack('filter', (state, conds) => {
  return compileAnd(state, conds);
});

function compileJoins(state, tableRef, internalTableFilters) {
  let joins = [];
  state.paths.forEach((desc, path) => {
    let { tableName, tableId, joinField, joinTable, noMapping } =
      state.paths.get(path);

    let on = `${tableId}.id = ${tableRef(joinTable)}.${quoteAlias(joinField)}`;

    let filters = internalTableFilters(tableName);
    if (filters.length > 0) {
      on +=
        ' AND ' +
        compileAnd(
          { ...state, implicitTableName: tableName, implicitTableId: tableId },
          filters,
        );
    }

    joins.push(
      `LEFT JOIN ${
        noMapping ? tableName : tableRef(tableName, true)
      } ${tableId} ON ${addTombstone(state.schema, tableName, tableId, on)}`,
    );

    if (state.dependencies.indexOf(tableName) === -1) {
      state.dependencies.push(tableName);
    }
  });
  return joins.join('\n');
}

function expandStar(state, expr) {
  let path;
  let pathInfo;
  if (expr === '*') {
    pathInfo = {
      tableName: state.implicitTableName,
      tableId: state.implicitTableId,
    };
  } else if (expr.match(/\.\*$/)) {
    let result = popPath(expr);
    path = result.path;
    pathInfo = resolvePath(state, result.path);
  }

  let table = state.schema[pathInfo.tableName];
  if (table == null) {
    throw new Error(`Table “${pathInfo.tableName}” does not exist`);
  }

  return Object.keys(table).map(field => (path ? `${path}.${field}` : field));
}

const compileSelect = saveStack(
  'select',
  (state, exprs, isAggregate, orders) => {
    // Always include the id if it's not an aggregate
    if (!isAggregate && !exprs.includes('id') && !exprs.includes('*')) {
      exprs = exprs.concat(['id']);
    }

    let select = exprs.map(expr => {
      if (typeof expr === 'string') {
        if (expr.indexOf('*') !== -1) {
          let fields = expandStar(state, expr);

          return fields
            .map(field => {
              let compiled = compileExpr(state, '$' + field);
              state.outputTypes.set(field, compiled.type);
              return compiled.value + ' AS ' + quoteAlias(field);
            })
            .join(', ');
        }

        let compiled = compileExpr(state, '$' + expr);
        state.outputTypes.set(expr, compiled.type);
        return compiled.value + ' AS ' + quoteAlias(expr);
      }

      let [name, value] = Object.entries(expr)[0];
      if (name[0] === '$') {
        state.compileStack.push({ type: 'value', value: expr });
        throw new CompileError(
          `Invalid field “${name}”, are you trying to select a function? You need to name the expression`,
        );
      }

      if (typeof value === 'string') {
        let compiled = compileExpr(state, '$' + value);
        state.outputTypes.set(name, compiled.type);
        return `${compiled.value} AS ${quoteAlias(name)}`;
      }

      let compiled = compileFunction({ ...state, orders }, value);
      state.outputTypes.set(name, compiled.type);
      return compiled.value + ` AS ${quoteAlias(name)}`;
    });

    return select.join(', ');
  },
);

const compileGroupBy = saveStack('groupBy', (state, exprs) => {
  let groupBy = exprs.map(expr => {
    if (typeof expr === 'string') {
      return compileExpr(state, '$' + expr).value;
    }

    return compileFunction(state, expr).value;
  });

  return groupBy.join(', ');
});

const compileOrderBy = saveStack('orderBy', (state, exprs) => {
  let orderBy = exprs.map(expr => {
    let compiled;
    let dir = null;

    if (typeof expr === 'string') {
      compiled = compileExpr(state, '$' + expr).value;
    } else {
      let entries = Object.entries(expr);
      let entry = entries[0];

      // Check if this is a field reference
      if (entries.length === 1 && entry[0][0] !== '$') {
        dir = entry[1];
        compiled = compileExpr(state, '$' + entry[0]).value;
      } else {
        // Otherwise it's a function
        let { $dir, ...func } = expr;
        dir = $dir;
        compiled = compileFunction(state, func).value;
      }
    }

    if (dir != null) {
      if (dir !== 'desc' && dir !== 'asc') {
        throw new CompileError('Invalid order direction: ' + dir);
      }
      return `${compiled} ${dir}`;
    }
    return compiled;
  });

  return orderBy.join(', ');
});

let AGGREGATE_FUNCTIONS = ['$sum', '$count'];
function isAggregateFunction(expr) {
  if (typeof expr !== 'object' || Array.isArray(expr)) {
    return false;
  }

  let [name, argExprs] = Object.entries(expr)[0];
  if (!Array.isArray(argExprs)) {
    argExprs = [argExprs];
  }

  if (AGGREGATE_FUNCTIONS.indexOf(name) !== -1) {
    return true;
  }

  return !!(argExprs as unknown[]).find(ex => isAggregateFunction(ex));
}

export function isAggregateQuery(queryState) {
  // it's aggregate if:
  // either an aggregate function is used in `select`
  // or a `groupBy` exists

  if (queryState.groupExpressions.length > 0) {
    return true;
  }

  return !!queryState.selectExpressions.find(expr => {
    if (typeof expr !== 'string') {
      let [_, value] = Object.entries(expr)[0];
      return isAggregateFunction(value);
    }
    return false;
  });
}

type SchemaConfig = {
  tableViews?: Record<string, unknown> | ((...args: unknown[]) => unknown);
  tableFilters?: (name: string) => unknown[];
  customizeQuery?: <T>(queryString: T) => T;
};
export function compileQuery(
  queryState,
  schema,
  schemaConfig: SchemaConfig = {},
) {
  let { withDead, validateRefs = true, tableOptions, rawMode } = queryState;

  let {
    tableViews = {},
    tableFilters = name => [],
    customizeQuery = queryState => queryState,
  } = schemaConfig;

  let internalTableFilters = name => {
    let filters = tableFilters(name);
    // These filters cannot join tables and must be simple strings
    for (let filter of filters) {
      if (Array.isArray(filter)) {
        throw new CompileError(
          'Invalid internal table filter: only object filters are supported',
        );
      }
      if (Object.keys(filter)[0].indexOf('.') !== -1) {
        throw new CompileError(
          'Invalid internal table filter: field names cannot contain paths',
        );
      }
    }
    return filters;
  };

  let tableRef = (name: string, isJoin?: boolean) => {
    let view =
      typeof tableViews === 'function'
        ? tableViews(name, { withDead, isJoin, tableOptions })
        : tableViews[name];
    return view || name;
  };

  let tableName = queryState.table;

  let {
    filterExpressions,
    selectExpressions,
    groupExpressions,
    orderExpressions,
    limit,
    offset,
  } = customizeQuery(queryState);

  let select = '';
  let where = '';
  let joins = '';
  let groupBy = '';
  let orderBy = '';
  let state = {
    schema,
    implicitTableName: tableName,
    implicitTableId: tableRef(tableName),
    paths: new Map(),
    dependencies: [tableName],
    compileStack: [],
    outputTypes: new Map(),
    validateRefs,
    namedParameters: [],
  };

  resetUid();

  try {
    select = compileSelect(
      state,
      selectExpressions,
      isAggregateQuery(queryState),
      orderExpressions,
    );

    if (filterExpressions.length > 0) {
      let result = compileWhere(state, filterExpressions);
      where = 'WHERE ' + result;
    } else {
      where = 'WHERE 1';
    }

    if (!rawMode) {
      let filters = internalTableFilters(tableName);
      if (filters.length > 0) {
        where += ' AND ' + compileAnd(state, filters);
      }
    }

    if (groupExpressions.length > 0) {
      let result = compileGroupBy(state, groupExpressions);
      groupBy = 'GROUP BY ' + result;
    }

    // Orders don't matter if doing a single calculation
    if (orderExpressions.length > 0) {
      let result = compileOrderBy(state, orderExpressions);
      orderBy = 'ORDER BY ' + result;
    }

    if (state.paths.size > 0) {
      joins = compileJoins(state, tableRef, internalTableFilters);
    }
  } catch (e) {
    if (e instanceof CompileError) {
      throw getCompileError(e, state.compileStack);
    }

    throw e;
  }

  let sqlPieces = {
    select,
    from: tableRef(tableName),
    joins,
    where,
    groupBy,
    orderBy,
    limit,
    offset,
  };

  return {
    sqlPieces,
    state,
  };
}

export function defaultConstructQuery(queryState, state, sqlPieces) {
  let s = sqlPieces;

  let where = queryState.withDead
    ? s.where
    : addTombstone(
        state.schema,
        state.implicitTableName,
        state.implicitTableId,
        s.where,
      );

  return `
    SELECT ${s.select} FROM ${s.from}
    ${s.joins}
    ${where}
    ${s.groupBy}
    ${s.orderBy}
    ${s.limit != null ? `LIMIT ${s.limit}` : ''}
    ${s.offset != null ? `OFFSET ${s.offset}` : ''}
  `;
}

export function generateSQLWithState(
  queryState,
  schema?: unknown,
  schemaConfig?: unknown,
) {
  let { sqlPieces, state } = compileQuery(queryState, schema, schemaConfig);
  return { sql: defaultConstructQuery(queryState, state, sqlPieces), state };
}
