const dateFns = require('date-fns');

const AlwaysTrue = Symbol('AlwaysTrue');
let shouldLog = false;

// TODO: We need to track conformance with the SQL behavior that
// sqlite implements. Luckily we are restricted to a very small subset
// of the language, but we still need to be careful about things like
// type coercion.

function bind(args, func) {
  // if (shouldLog) {
  //   console.log(args, func.toString());
  // }
  for (var i = 0; i < args.length; i++) {
    if (args[i] === AlwaysTrue) {
      return AlwaysTrue;
    }
  }
  return func();
}

const builtinFuncs = {
  concat: function (str1, str2) {
    return str1 + str2;
  },
  date: function (str) {
    return dateFns.parseISO(str);
  }
};

function interpretExpr(expr, context) {
  switch (expr.getTypeName()) {
    case 'FunCall':
      const args = expr.args.map(arg => interpretExpr(arg, context));
      return bind(args, () => {
        return builtinFuncs[expr.name].apply(null, args);
      });

    case 'Member':
      // We don't support walking through table schema yet. Any joined
      // fields are always evaluated as true. These will always exist
      // as member expressions; fields from the implicit table will
      // simply be symbols.
      return AlwaysTrue;

    case 'Literal':
      return expr.value;

    case 'Symbol':
      return expr.value in context.row ? context.row[expr.value] : AlwaysTrue;

    case 'BinOp':
      switch (expr.op) {
        case 'or': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([expr.left, expr.right], () => {
            return left || right;
          });
        }
        case 'and': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return left && right;
        }
        case '=': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => {
            if (left instanceof Date && right instanceof Date) {
              return dateFns.isEqual(left, right);
            }
            return left === right;
          });
        }
        case '=~': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => {
            return left && left.match(new RegExp(right.replace('%', '.*')));
          });
        }
        case '!=~': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => {
            return left && !left.match(new RegExp(right.replace('%', '.*')));
          });
        }
        case '>': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => {
            if (left instanceof Date) {
              return dateFns.isAfter(left, dateFns.parseISO(right));
            }
            return left > right;
          });
        }
        case '<': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => {
            if (left instanceof Date) {
              return dateFns.isBefore(left, dateFns.parseISO(right));
            }
            return left < right;
          });
        }
        case '>=': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => {
            if (left instanceof Date) {
              return (
                dateFns.isAfter(left, dateFns.parseISO(right)) ||
                dateFns.isEqual(left, dateFns.parseISO(right))
              );
            }
            return left >= right;
          });
        }
        case '<=': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => {
            if (left instanceof Date) {
              return (
                dateFns.isBefore(left, dateFns.parseISO(right)) ||
                dateFns.isEqual(left, dateFns.parseISO(right))
              );
            }
            return left <= right;
          });
        }
        case '-': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => left - right);
        }
        case '+': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => left + right);
        }
        case '*': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => left * right);
        }
        case '/': {
          const left = interpretExpr(expr.left, context);
          const right = interpretExpr(expr.right, context);
          return bind([left, right], () => left / right);
        }
        default:
          console.log(expr);
          throw new Error('Unable to interpret operator: ' + expr.op);
      }

    default:
      throw new Error('Unknown sql node: ' + expr.getTypeName());
  }
}

function interpret(where, row, table) {
  // if (where.op !== 'or' && where.op !== 'and') {
  //   throw new Error(
  //     'Invalid where clause: top-level expression must be AND or OR'
  //   );
  // }

  // Set this to `true` for debugging
  shouldLog = false;

  let ret = interpretExpr(where, { row, table });

  if (shouldLog) {
    console.log('Final', ret);
  }
  shouldLog = false;

  return ret;
}

module.exports = interpret;
