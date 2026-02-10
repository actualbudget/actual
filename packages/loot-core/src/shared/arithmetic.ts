import { currencyToAmount } from './util';

type ParserState = {
  str: string;
  index: number;
};

type Operator = '+' | '-' | '*' | '/' | '^';

type OperatorNode = {
  op: Operator;
  left: AstNode;
  right: AstNode;
};

type AstNode = number | OperatorNode;

function fail(state: ParserState, msg: string): never {
  throw new Error(
    msg + ': ' + JSON.stringify(state.str.slice(state.index, 10)),
  );
}

function char(state: ParserState): string | undefined {
  return state.str[state.index];
}

function next(state: ParserState): string | null {
  if (state.index >= state.str.length) {
    return null;
  }

  const ch = char(state);
  state.index++;
  return ch ?? null;
}

function nextOperator(state: ParserState, op: string): boolean {
  if (char(state) === op) {
    next(state);
    return true;
  }

  return false;
}

function parsePrimary(state: ParserState): number {
  // We only support numbers
  const isNegative = char(state) === '-';
  if (isNegative) {
    next(state);
  }

  let numberStr = '';
  let currentChar = char(state);
  while (
    currentChar &&
    currentChar.match(/[0-9,.'\u2019\u00A0\u202F ]|\p{Sc}/u)
  ) {
    const ch = next(state);
    if (ch !== null) {
      numberStr += ch;
    }
    currentChar = char(state);
  }

  if (numberStr === '') {
    fail(state, 'Unexpected character');
  }

  const number = currencyToAmount(numberStr);
  if (number === null) {
    fail(state, 'Invalid number format');
  }
  return isNegative ? -number : number;
}

function parseParens(state: ParserState): AstNode {
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

function makeOperatorParser<T extends readonly Operator[]>(...ops: T) {
  type ParserFn = (state: ParserState) => AstNode;
  return ops.reduce<ParserFn>((prevParser: ParserFn, op: Operator) => {
    return (state: ParserState) => {
      let node = prevParser(state);
      while (nextOperator(state, op)) {
        node = { op, left: node, right: prevParser(state) };
      }
      return node;
    };
  }, parseParens);
}

// These operators go from high to low order of precedence
const parseOperator = makeOperatorParser('^', '/', '*', '-', '+');

function parse(expression: string): AstNode {
  const state = { str: expression.replace(/\s/g, ''), index: 0 };
  return parseOperator(state);
}

function evaluate(ast: AstNode): number {
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
