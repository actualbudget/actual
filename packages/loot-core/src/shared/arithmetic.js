import { getNumberFormat } from './util';

function fail(state, msg) {
  throw new Error(
    msg + ': ' + JSON.stringify(state.str.slice(state.index, 10))
  );
}

function char(state) {
  return state.str[state.index];
}

function next(state) {
  if (state.index >= state.str.length) {
    return null;
  }

  let ch = char(state);
  state.index++;
  return ch;
}

function nextOperator(state, op) {
  if (char(state) === op) {
    next(state);
    return true;
  }

  return false;
}

function parsePrimary(state) {
  // We only support numbers
  let isNegative = char(state) === '-';
  if (isNegative) {
    next(state);
  }

  // TODO: Support currency symbols better
  if (char(state) === '$') {
    next(state);
  }

  // TODO: The regex should probably respect the number format better,
  // and we should do more strict parsing
  let numberStr = '';
  while (char(state) && char(state).match(/[0-9,.]/)) {
    let thousandsSep = getNumberFormat().separator === ',' ? '.' : ',';

    // Don't include the thousands separator
    if (char(state) === thousandsSep) {
      next(state);
    } else {
      numberStr += next(state);
    }
  }

  if (numberStr === '') {
    fail(state, 'Unexpected character');
  }

  let number = parseFloat(numberStr.replace(getNumberFormat().separator, '.'));
  return isNegative ? -number : number;
}

function parseParens(state) {
  if (char(state) === '(') {
    next(state);
    let expr = parseOperator(state);

    if (char(state) !== ')') {
      fail(state, 'Unbalanced parentheses');
    }

    next(state);
    return expr;
  }

  return parsePrimary(state);
}

function makeOperatorParser(...ops) {
  return ops.reduce((prevParser, op) => {
    return state => {
      let node = prevParser(state);
      while (nextOperator(state, op)) {
        node = { op, left: node, right: prevParser(state) };
      }
      return node;
    };
  }, parseParens);
}

// These operators go from high to low order of precedence
let parseOperator = makeOperatorParser('^', '/', '*', '-', '+');

function parse(expression) {
  let state = { str: expression.replace(/\s/g, ''), index: 0 };
  return parseOperator(state);
}

function evaluate(ast) {
  if (typeof ast === 'number') {
    return ast;
  }

  let { left, right, op } = ast;

  switch (op) {
    case '+':
      return evaluate(left) + evaluate(right);
    case '-':
      return evaluate(left) - evaluate(right);
    case '*':
      return evaluate(left) * evaluate(right);
    case '/':
      return evaluate(left) / evaluate(right);
    case '^':
      return Math.pow(evaluate(left), evaluate(right));
    default:
      throw new Error('Unknown operator: ' + op);
  }
}

export default function evalArithmetic(expression, defaultValue = null) {
  // An empty expression always evals to the default
  if (expression === '') {
    return defaultValue;
  }

  let result;
  try {
    result = evaluate(parse(expression));
  } catch (e) {
    // If it errors, return the default value
    return defaultValue;
  }

  // Never return NaN
  return isNaN(result) ? defaultValue : result;
}
