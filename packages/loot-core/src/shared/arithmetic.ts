// @ts-strict-ignore
import { currencyToAmount } from './util';

function fail(state, msg) {
  throw new Error(
    msg + ': ' + JSON.stringify(state.str.slice(state.index, 10)),
  );
}

function char(state) {
  return state.str[state.index];
}

function next(state) {
  if (state.index >= state.str.length) {
    return null;
  }

  const ch = char(state);
  state.index++;
  return ch;
}

function parsePrimary(state) {
  // We only support numbers
  const isNegative = char(state) === '-';
  if (isNegative) {
    next(state);
  }

  let numberStr = '';
  while (
    char(state) &&
    char(state).match(/[0-9,.'\u2019\u00A0\u202F ]|\p{Sc}/u)
  ) {
    numberStr += next(state);
  }

  if (numberStr === '') {
    fail(state, 'Unexpected character');
  }

  const number = currencyToAmount(numberStr);
  return isNegative ? -number : number;
}

function parseParens(state) {
  if (char(state) === '(') {
    next(state);
    const expr = parseOperator(state);

    if (char(state) !== ')') {
      fail(state, 'Unbalanced parentheses');
    }

    next(state);
    return expr;
  }

  return parsePrimary(state);
}

// Parse operators with correct precedence grouping.
// Operators at the same precedence level should be grouped together.
// Precedence (highest to lowest): ^ > (*, /) > (+, -)

function parseExponent(state) {
  let node = parseParens(state);
  if (char(state) === '^') {
    next(state);
    node = { op: '^', left: node, right: parseExponent(state) };
  }
  return node;
}

function parseMultDiv(state) {
  let node = parseExponent(state);
  while (char(state) === '*' || char(state) === '/') {
    const op = next(state);
    node = { op, left: node, right: parseExponent(state) };
  }
  return node;
}

function parseAddSub(state) {
  let node = parseMultDiv(state);
  while (char(state) === '+' || char(state) === '-') {
    const op = next(state);
    node = { op, left: node, right: parseMultDiv(state) };
  }
  return node;
}

const parseOperator = parseAddSub;

function parse(expression: string) {
  const state = { str: expression.replace(/\s/g, ''), index: 0 };
  return parseOperator(state);
}

function evaluate(ast): number {
  if (typeof ast === 'number') {
    return ast;
  }

  const { left, right, op } = ast;

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

export function evalArithmetic(
  expression: string,
  defaultValue: number | null = null,
): number | null {
  // An empty expression always evals to the default
  if (expression === '') {
    return defaultValue;
  }

  let result: number;
  try {
    result = evaluate(parse(expression));
  } catch {
    // If it errors, return the default value
    return defaultValue;
  }

  // Never return NaN
  return isNaN(result) ? defaultValue : result;
}
