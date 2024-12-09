// @ts-strict-ignore
import { currencyToAmount } from './util';

// These operators go from high to low order of precedence
const operators = ['^', '/', '÷', '*', '×', '-', '+'] as const;
type ArithmeticOp = (typeof operators)[number];

type ArithmeticAst =
  | number
  | { op: ArithmeticOp; left: ArithmeticAst; right: ArithmeticAst };

type ArithmeticState = { str: string; index: number };

const parseOperator = makeOperatorParser(...operators);

function fail(state: ArithmeticState, msg: string) {
  throw new Error(
    msg + ': ' + JSON.stringify(state.str.slice(state.index, 10)),
  );
}

function char(state: ArithmeticState): string {
  return state.str[state.index];
}

function next(state: ArithmeticState): string {
  if (state.index >= state.str.length) {
    return null;
  }

  const ch = char(state);
  state.index++;
  return ch;
}

function nextOperator(state: ArithmeticState, op: ArithmeticOp) {
  if (char(state) === op) {
    next(state);
    return true;
  }

  return false;
}

function parsePrimary(state: ArithmeticState): number {
  // We only support numbers
  const isNegative = char(state) === '-';
  if (isNegative) {
    next(state);
  }

  let numberStr = '';
  while (char(state) && char(state).match(/[0-9,.’\xa0 ]|\p{Sc}/u)) {
    numberStr += next(state);
  }

  if (numberStr === '') {
    fail(state, 'Unexpected character');
  }

  const number = currencyToAmount(numberStr);
  return isNegative ? -number : number;
}

function parseParens(state: ArithmeticState): ArithmeticAst {
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

function makeOperatorParser(...ops: ArithmeticOp[]) {
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

function parse(expression: string): ArithmeticAst {
  const state: ArithmeticState = {
    str: expression.replace(/\s/g, ''),
    index: 0,
  };
  return parseOperator(state);
}

function evaluate(ast: ArithmeticAst): number {
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
    case '×':
      return evaluate(left) * evaluate(right);
    case '/':
    case '÷':
      return evaluate(left) / evaluate(right);
    case '^':
      return Math.pow(evaluate(left), evaluate(right));
    default:
      throw new Error('Unknown operator: ' + op);
  }
}

export function evalArithmetic(
  expression: string,
  defaultValue: number = null,
): number {
  // An empty expression always evals to the default
  if (expression === '') {
    return defaultValue;
  }

  let result: number;
  try {
    result = evaluate(parse(expression));
  } catch (e) {
    // If it errors, return the default value
    return defaultValue;
  }

  // Never return NaN
  return isNaN(result) ? defaultValue : result;
}

export function hasArithmeticOperator(expression: string): boolean {
  return operators.some(op => expression.includes(op));
}

export function lastIndexOfArithmeticOperator(expression: string): number {
  return operators.reduce((max, op) => {
    const index = expression.lastIndexOf(op);
    return index > max ? index : max;
  }, -1);
}
