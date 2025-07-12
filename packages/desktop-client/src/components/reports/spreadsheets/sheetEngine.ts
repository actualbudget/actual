/* eslint-disable actual/typography */
// Simple spreadsheet engine for formula evaluation
// Supports basic arithmetic, functions, and cell references

// ----------------------------- Lexer -------------------------------
export enum TokenKind {
  Number,
  String, // New: string literals
  Identifier,
  CellRef, // New: cell references like row-1, row-2
  LParen,
  RParen,
  LBrace,
  RBrace,
  Comma,
  Colon, // New: for ranges like row-1:row-5
  Plus,
  Minus,
  Star,
  Slash,
  Caret,
  Percent, // only as part of number but easier to treat separately
  GT, // New: >
  LT, // New: <
  GTE, // New: >=
  LTE, // New: <=
  EQ, // New: ==
  NE, // New: !=
  EOF,
}

type Token = {
  kind: TokenKind;
  value?: string;
  pos: number;
};

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

function isCellRef(str: string): boolean {
  // Match pattern: "row-" followed by one or more digits (row-1, row-10, etc.)
  return /^row-\d+$/i.test(str);
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const push = (kind: TokenKind, value?: string) => {
    tokens.push({ kind, value, pos: i });
  };

  while (i < input.length) {
    const ch = input[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    switch (ch) {
      case '+':
        push(TokenKind.Plus);
        i++;
        continue;
      case '-':
        push(TokenKind.Minus);
        i++;
        continue;
      case '*':
        push(TokenKind.Star);
        i++;
        continue;
      case '/':
        push(TokenKind.Slash);
        i++;
        continue;
      case '^':
        push(TokenKind.Caret);
        i++;
        continue;
      case '(':
        push(TokenKind.LParen);
        i++;
        continue;
      case ')':
        push(TokenKind.RParen);
        i++;
        continue;
      case ',':
        push(TokenKind.Comma);
        i++;
        continue;
      case ':':
        push(TokenKind.Colon);
        i++;
        continue;
      case '>':
        if (input[i + 1] === '=') {
          push(TokenKind.GTE);
          i += 2;
        } else {
          push(TokenKind.GT);
          i++;
        }
        continue;
      case '<':
        if (input[i + 1] === '=') {
          push(TokenKind.LTE);
          i += 2;
        } else {
          push(TokenKind.LT);
          i++;
        }
        continue;
      case '=':
        if (input[i + 1] === '=') {
          push(TokenKind.EQ);
          i += 2;
        } else {
          // Single = is not a valid token for now
          throw new Error(`Unexpected character '${ch}' at ${i}`);
        }
        continue;
      case '!':
        if (input[i + 1] === '=') {
          push(TokenKind.NE);
          i += 2;
        } else {
          throw new Error(`Unexpected character '${ch}' at ${i}`);
        }
        continue;
      case '"':
      case "'":
        // String literal parsing
        const quote = ch;
        const start = i + 1;
        i++; // skip opening quote
        let str = '';
        while (i < input.length && input[i] !== quote) {
          if (input[i] === '\\' && i + 1 < input.length) {
            // Handle escape sequences
            i++;
            switch (input[i]) {
              case 'n': {
                str += '\n';
                break;
              }
              case 't': {
                str += '\t';
                break;
              }
              case 'r': {
                str += '\r';
                break;
              }
              case '\\': {
                str += '\\';
                break;
              }
              case '"': {
                str += '"';
                break;
              }
              case "'": {
                str += "'";
                break;
              }
              default: {
                str += input[i];
                break;
              }
            }
          } else {
            str += input[i];
          }
          i++;
        }
        if (i >= input.length) {
          throw new Error(
            `Unterminated string literal starting at ${start - 1}`,
          );
        }
        push(TokenKind.String, str);
        i++; // skip closing quote
        continue;
      case '{': {
        // capture until matching }
        let depth = 1;
        const start = ++i;
        while (i < input.length && depth > 0) {
          if (input[i] === '{') depth++;
          else if (input[i] === '}') depth--;
          if (depth === 0) break;
          i++;
        }
        if (depth !== 0) {
          throw new Error('Unterminated query block');
        }
        const queryStr = input.slice(start, i).trim();
        push(TokenKind.LBrace, queryStr); // store query string in value
        push(TokenKind.RBrace);
        i++; // skip closing }
        continue;
      }
      default:
        break;
    }

    if (isDigit(ch) || (ch === '.' && isDigit(input[i + 1]))) {
      const start = i;
      // Parse integer part, handling comma separators properly
      while (i < input.length && isDigit(input[i])) i++;

      // Handle comma separators (only if followed by exactly 3 digits)
      while (
        i < input.length &&
        input[i] === ',' &&
        i + 3 < input.length &&
        isDigit(input[i + 1]) &&
        isDigit(input[i + 2]) &&
        isDigit(input[i + 3]) &&
        (i + 4 >= input.length || !isDigit(input[i + 4]))
      ) {
        i++; // consume comma
        i += 3; // consume exactly 3 digits
      }

      // Parse decimal part if present
      if (i < input.length && input[i] === '.') {
        i++;
        while (i < input.length && isDigit(input[i])) i++;
      }

      if (i < input.length && input[i] === '%') {
        // percentage numeric literal
        push(TokenKind.Number, input.slice(start, i + 1));
        i++; // consume %
      } else {
        push(TokenKind.Number, input.slice(start, i));
      }
      continue;
    }

    if (isAlpha(ch) || ch === '_') {
      const start = i;
      while (
        i < input.length &&
        (isAlpha(input[i]) ||
          isDigit(input[i]) ||
          input[i] === '_' ||
          input[i] === '-')
      ) {
        i++;
      }
      const text = input.slice(start, i);

      // Check if this is a cell reference (e.g., row-1, row-2, row-10)
      if (isCellRef(text)) {
        push(TokenKind.CellRef, text.toLowerCase()); // normalize to lowercase
      } else {
        push(TokenKind.Identifier, text);
      }
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at ${i}`);
  }
  push(TokenKind.EOF);
  return tokens;
}

// ----------------------------- Parser ------------------------------

// AST Nodes
type NumberNode = {
  type: 'Number';
  value: number;
};
type StringNode = {
  type: 'String';
  value: string;
};
type QueryNode = {
  type: 'Query';
  query: string; // raw string
};
type IdentifierNode = {
  type: 'Identifier';
  name: string;
};
type CellRefNode = {
  type: 'CellRef';
  ref: string; // e.g., "row-1", "row-2"
};
type RangeNode = {
  type: 'Range';
  start: CellRefNode;
  end: CellRefNode;
};
type CallNode = {
  type: 'Call';
  callee: IdentifierNode;
  args: Expression[];
};
type BinaryNode = {
  type: 'Binary';
  operator: string;
  left: Expression;
  right: Expression;
};
type UnaryNode = {
  type: 'Unary';
  operator: string;
  argument: Expression;
};

type Expression =
  | NumberNode
  | StringNode
  | QueryNode
  | IdentifierNode
  | CellRefNode
  | RangeNode
  | CallNode
  | BinaryNode
  | UnaryNode;

class Parser {
  private tokens: Token[];
  private pos = 0;
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }
  private peek(kind?: TokenKind): Token {
    const t = this.tokens[this.pos];
    if (kind !== undefined && t.kind !== kind) {
      throw new Error(
        `Expected token ${TokenKind[kind]}, got ${TokenKind[t.kind]}`,
      );
    }
    return t;
  }
  private consume(kind: TokenKind): Token {
    const t = this.peek(kind);
    this.pos++;
    return t;
  }

  parse(): Expression {
    const expr = this.parseExpression();
    this.consume(TokenKind.EOF);
    return expr;
  }

  // Parse expressions in function arguments - stops at commas and right parens
  private parseArgumentExpression(): Expression {
    return this.parseExpression(0);
  }

  // Precedence climbing parser
  private parseExpression(minPrec = 0): Expression {
    let left = this.parsePrimary();

    const prec = (tk: TokenKind): number => {
      switch (tk) {
        case TokenKind.EQ:
        case TokenKind.NE:
        case TokenKind.GT:
        case TokenKind.LT:
        case TokenKind.GTE:
        case TokenKind.LTE:
          return 0.5; // Comparison operators have lowest precedence
        case TokenKind.Plus:
        case TokenKind.Minus:
          return 1;
        case TokenKind.Star:
        case TokenKind.Slash:
          return 2;
        case TokenKind.Caret:
          return 3;
        default:
          return 0;
      }
    };
    const isRightAssoc = (tk: TokenKind) => tk === TokenKind.Caret;

    while (true) {
      const t = this.peek();
      const p = prec(t.kind);
      if (p === 0 || p < minPrec) break;
      this.pos++;
      const nextMin = isRightAssoc(t.kind) ? p : p + 1;
      const right = this.parseExpression(nextMin);
      let operator: string;
      switch (t.kind) {
        case TokenKind.Caret:
          operator = '^';
          break;
        case TokenKind.Plus:
          operator = '+';
          break;
        case TokenKind.Minus:
          operator = '-';
          break;
        case TokenKind.Star:
          operator = '*';
          break;
        case TokenKind.Slash:
          operator = '/';
          break;
        case TokenKind.GT:
          operator = '>';
          break;
        case TokenKind.LT:
          operator = '<';
          break;
        case TokenKind.GTE:
          operator = '>=';
          break;
        case TokenKind.LTE:
          operator = '<=';
          break;
        case TokenKind.EQ:
          operator = '==';
          break;
        case TokenKind.NE:
          operator = '!=';
          break;
        default:
          operator = '?';
          break;
      }
      left = {
        type: 'Binary',
        operator,
        left,
        right,
      };
    }
    return left;
  }

  private parsePrimary(): Expression {
    const t = this.peek();
    switch (t.kind) {
      case TokenKind.LParen: {
        this.consume(TokenKind.LParen);
        const expr = this.parseExpression();
        this.consume(TokenKind.RParen);
        return expr;
      }
      case TokenKind.Number:
        this.pos++;
        return { type: 'Number', value: parseNumber(t.value!) };
      case TokenKind.String:
        this.pos++;
        return { type: 'String', value: t.value! };
      case TokenKind.Plus:
      case TokenKind.Minus:
        this.pos++;
        return {
          type: 'Unary',
          operator: t.kind === TokenKind.Plus ? '+' : '-',
          argument: this.parsePrimary(),
        };
      case TokenKind.LBrace: {
        const query = this.consume(TokenKind.LBrace);
        this.consume(TokenKind.RBrace);
        return { type: 'Query', query: query.value! };
      }
      case TokenKind.CellRef: {
        // Handle cell references and ranges
        const cellRef = this.consume(TokenKind.CellRef);
        // Check if this is a range (cellRef:cellRef)
        if (this.peek().kind === TokenKind.Colon) {
          this.consume(TokenKind.Colon);
          const endCellRef = this.consume(TokenKind.CellRef);
          return {
            type: 'Range',
            start: { type: 'CellRef', ref: cellRef.value! },
            end: { type: 'CellRef', ref: endCellRef.value! },
          };
        }
        return { type: 'CellRef', ref: cellRef.value! };
      }
      case TokenKind.Identifier: {
        const ident = this.consume(TokenKind.Identifier);
        if (this.peek().kind === TokenKind.LParen) {
          // function call
          this.consume(TokenKind.LParen);
          const args: Expression[] = [];

          // Parse arguments if any exist
          if (this.peek().kind !== TokenKind.RParen) {
            // Parse first argument
            args.push(this.parseArgumentExpression());

            // Parse remaining arguments
            while (this.peek().kind === TokenKind.Comma) {
              this.consume(TokenKind.Comma);
              args.push(this.parseArgumentExpression());
            }
          }

          this.consume(TokenKind.RParen);
          return {
            type: 'Call',
            callee: { type: 'Identifier', name: ident.value! },
            args,
          };
        }
        return { type: 'Identifier', name: ident.value! };
      }
      default:
        throw new Error(`Unexpected token: ${TokenKind[t.kind]}`);
    }
  }
}

function parseNumber(raw: string): number {
  if (raw.endsWith('%')) {
    return parseFloat(raw.slice(0, -1)) / 100;
  }
  return parseFloat(raw.replace(/,/g, ''));
}

export type EvaluationContext = {
  cost: (q: string | unknown) => number;
  balance: (q: string | unknown) => number;
  fifo: (q: string | unknown) => unknown; // not used in MVP
  negate: (q: string | unknown) => unknown;
  queryRunner: (query: string) => unknown;
  lookupIdentifier?: (name: string) => number;
  getCellValue?: (ref: string) => number; // New: function to get cell values
};

function evaluate(node: Expression, ctx: EvaluationContext): number | unknown {
  switch (node.type) {
    case 'Number':
      return node.value;
    case 'String':
      return node.value;
    case 'Query':
      return ctx.queryRunner(node.query);
    case 'Identifier':
      if (ctx.lookupIdentifier) {
        return ctx.lookupIdentifier(node.name);
      }
      throw new Error(`Unknown identifier: ${node.name}`);
    case 'CellRef': // Handle cell reference evaluation
      if (ctx.getCellValue) {
        return ctx.getCellValue(node.ref);
      }
      throw new Error(`Cannot resolve cell reference: ${node.ref}`);
    case 'Range': // Handle range evaluation (expand to array of values)
      if (ctx.getCellValue) {
        const values: number[] = [];
        const startMatch = node.start.ref.match(/row-(\d+)/);
        const endMatch = node.end.ref.match(/row-(\d+)/);
        if (startMatch && endMatch) {
          const startNum = parseInt(startMatch[1]);
          const endNum = parseInt(endMatch[1]);
          for (let i = startNum; i <= endNum; i++) {
            const value = ctx.getCellValue(`row-${i}`);
            if (typeof value === 'number') {
              values.push(value);
            }
          }
        }
        return values;
      }
      throw new Error(
        `Cannot resolve range: ${node.start.ref}:${node.end.ref}`,
      );
    case 'Call': {
      const fn = node.callee.name;
      const argValues = node.args.map(arg => evaluate(arg, ctx));
      switch (fn) {
        case 'cost':
          return ctx.cost(argValues[0]);
        case 'balance':
          return ctx.balance(argValues[0]);
        case 'fifo':
          return ctx.fifo(argValues[0]);
        case 'negate':
          return ctx.negate(argValues[0]);
        case 'sum': {
          // Sum function that handles arrays and individual values
          let total = 0;
          for (const val of argValues) {
            if (typeof val === 'number') {
              total += val;
            } else if (Array.isArray(val)) {
              for (const item of val) {
                if (typeof item === 'number') {
                  total += item;
                }
              }
            }
          }
          return total;
        }
        case 'average': {
          // Average function that handles arrays and individual values
          let total = 0;
          let count = 0;
          for (const val of argValues) {
            if (typeof val === 'number') {
              total += val;
              count++;
            } else if (Array.isArray(val)) {
              for (const item of val) {
                if (typeof item === 'number') {
                  total += item;
                  count++;
                }
              }
            }
          }
          return count > 0 ? total / count : 0;
        }
        case 'min': {
          // Find minimum value, handles arrays and individual values
          let min = Number.POSITIVE_INFINITY;
          for (const val of argValues) {
            if (typeof val === 'number' && val < min) {
              min = val;
            } else if (Array.isArray(val)) {
              for (const item of val) {
                if (typeof item === 'number' && item < min) {
                  min = item;
                }
              }
            }
          }
          return min === Number.POSITIVE_INFINITY ? 0 : min;
        }
        case 'max': {
          // Find maximum value, handles arrays and individual values
          let max = Number.NEGATIVE_INFINITY;
          for (const val of argValues) {
            if (typeof val === 'number' && val > max) {
              max = val;
            } else if (Array.isArray(val)) {
              for (const item of val) {
                if (typeof item === 'number' && item > max) {
                  max = item;
                }
              }
            }
          }
          return max === Number.NEGATIVE_INFINITY ? 0 : max;
        }
        case 'count': {
          // Count numeric values, handles arrays and individual values
          let count = 0;
          for (const val of argValues) {
            if (typeof val === 'number') {
              count++;
            } else if (Array.isArray(val)) {
              for (const item of val) {
                if (typeof item === 'number') {
                  count++;
                }
              }
            }
          }
          return count;
        }
        case 'abs': {
          // Absolute value
          const val = argValues[0];
          return typeof val === 'number' ? Math.abs(val) : 0;
        }
        case 'round': {
          // Round to specified decimal places (default 0)
          const val = argValues[0];
          const decimals = argValues[1] || 0;
          if (typeof val === 'number' && typeof decimals === 'number') {
            return (
              Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals)
            );
          }
          return 0;
        }
        case 'floor': {
          // Round down
          const val = argValues[0];
          return typeof val === 'number' ? Math.floor(val) : 0;
        }
        case 'ceil': {
          // Round up
          const val = argValues[0];
          return typeof val === 'number' ? Math.ceil(val) : 0;
        }
        case 'sqrt': {
          // Square root
          const val = argValues[0];
          return typeof val === 'number' && val >= 0 ? Math.sqrt(val) : 0;
        }
        case 'pow': {
          // Power function
          const base = argValues[0];
          const exponent = argValues[1];
          if (typeof base === 'number' && typeof exponent === 'number') {
            return Math.pow(base, exponent);
          }
          return 0;
        }
        case 'if': {
          // Conditional function - if(condition, true_value, false_value)
          const condition = argValues[0];
          const trueValue = argValues[1];
          const falseValue = argValues[2];
          // Treat 0, null, undefined as false, everything else as true
          const isTrue =
            condition !== 0 && condition != null && condition !== '';
          return isTrue ? trueValue || 0 : falseValue || 0;
        }
        case 'and': {
          // Logical AND - returns 1 if all arguments are truthy, 0 otherwise
          for (const val of argValues) {
            if (val === 0 || val == null || val === '') {
              return 0;
            }
          }
          return 1;
        }
        case 'or': {
          // Logical OR - returns 1 if any argument is truthy, 0 otherwise
          for (const val of argValues) {
            if (val !== 0 && val != null && val !== '') {
              return 1;
            }
          }
          return 0;
        }
        case 'not': {
          // Logical NOT
          const val = argValues[0];
          return val === 0 || val == null || val === '' ? 1 : 0;
        }
        case 'today': {
          // Return today's date as a number (days since epoch)
          const today = new Date();
          return Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
        }
        case 'concatenate': {
          // Concatenate string values
          return argValues.map(val => String(val || '')).join('');
        }
        case 'len': {
          // Length of string
          const val = argValues[0];
          return String(val || '').length;
        }
        default:
          throw new Error(`Unknown function: ${fn}`);
      }
    }
    case 'Binary': {
      const left = evaluate(node.left, ctx);
      const right = evaluate(node.right, ctx);

      // Handle comparison operators (work with any types)
      switch (node.operator) {
        case '>':
          return (left as number) > (right as number) ? 1 : 0;
        case '<':
          return (left as number) < (right as number) ? 1 : 0;
        case '>=':
          return (left as number) >= (right as number) ? 1 : 0;
        case '<=':
          return (left as number) <= (right as number) ? 1 : 0;
        case '==':
          return left === right ? 1 : 0;
        case '!=':
          return left !== right ? 1 : 0;
      }

      // Handle arithmetic operators (require numbers)
      if (typeof left !== 'number' || typeof right !== 'number') {
        return 0;
      }
      switch (node.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return right !== 0 ? left / right : 0;
        case '^':
          return Math.pow(left, right);
        default:
          throw new Error(`Unknown operator: ${node.operator}`);
      }
    }
    case 'Unary': {
      const arg = evaluate(node.argument, ctx);
      if (typeof arg !== 'number') return 0;
      switch (node.operator) {
        case '+':
          return arg;
        case '-':
          return -arg;
        default:
          throw new Error(`Unknown unary operator: ${node.operator}`);
      }
    }
    default:
      throw new Error(`Unknown node type`);
  }
}

export function evaluateFormula(
  formula: string,
  ctx: EvaluationContext,
): number | unknown {
  const tokens = tokenize(formula);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return evaluate(ast, ctx);
}
