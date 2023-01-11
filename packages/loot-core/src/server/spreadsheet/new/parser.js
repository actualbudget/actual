import lex, * as types from './lexer';
import * as nodes from './nodes';

function nextToken(state, withWhitespace) {
  var tok;
  let { peeked, tokens } = state;

  if (peeked) {
    if (!withWhitespace && peeked.type === types.TOKEN_WHITESPACE) {
      state.peeked = null;
    } else {
      tok = state.peeked;
      state.peeked = null;
      return tok;
    }
  }

  tok = tokens.nextToken();

  if (!withWhitespace) {
    while (tok && tok.type === types.TOKEN_WHITESPACE) {
      tok = tokens.nextToken();
    }
  }

  return tok;
}

function peekToken(state) {
  state.peeked = state.peeked || nextToken(state);
  return state.peeked;
}

function pushToken(state, tok) {
  if (state.peeked) {
    throw new Error('pushToken: can only push one token on between reads');
  }
  state.peeked = tok;
}

function fail(state, msg, lineno, colno) {
  if (!peekToken(state)) {
    throw new Error(msg + '\n\nSource:\n' + state.src + '\n');
  } else if (lineno === undefined || colno === undefined) {
    const tok = peekToken(state);
    lineno = tok.lineno;
    colno = tok.colno;
  }

  const lines = state.src.split('\n');

  let space = '';
  for (let i = 0; i < colno; i++) {
    space += ' ';
  }

  throw new Error(
    `[${lineno + 1}, ${colno + 1}] ${msg}:\n${lines[lineno]}\n${space}^`
  );
}

function skip(state, type) {
  var tok = nextToken(state);
  if (!tok || tok.type !== type) {
    pushToken(state, tok);
    return false;
  }
  return true;
}

function expectValue(state, type, value) {
  var tok = nextToken(state);
  if (tok.type !== type || tok.value !== value) {
    fail(
      state,
      'expected ' + value + ', got ' + tok.value,
      tok.lineno,
      tok.colno
    );
  }
  return tok;
}

function expect(state, type) {
  var tok = nextToken(state);
  if (tok.type !== type) {
    fail(
      state,
      'expected ' + type + ', got ' + tok.type,
      tok.lineno,
      tok.colno
    );
  }
  return tok;
}

function skipValue(state, type, val) {
  var tok = nextToken(state);
  if (!tok || tok.type !== type || tok.value !== val) {
    pushToken(state, tok);
    return false;
  }
  return true;
}

function skipSymbol(state, val) {
  return skipValue(state, types.TOKEN_SYMBOL, val);
}

function parseExpression(state) {
  return parseOr(state);
}

function parseOr(state) {
  let left = parseAnd(state);
  while (skipValue(state, types.TOKEN_OPERATOR, 'or')) {
    const right = parseAnd(state);
    left = new nodes.BinOp(left.lineno, left.colno, 'or', left, right);
  }
  return left;
}

function parseAnd(state) {
  let left = parseNot(state);
  while (skipValue(state, types.TOKEN_OPERATOR, 'and')) {
    const right = parseNot(state);
    left = new nodes.BinOp(left.lineno, left.colno, 'and', left, right);
  }
  return left;
}

function parseNot(state) {
  let left = parseCompare(state);
  while (skipValue(state, types.TOKEN_OPERATOR, 'not')) {
    // eslint-disable-next-line no-unused-vars
    const right = parseCompare(state);
    left = new nodes.UnaryOp(left.lineno, left.colno, 'not', parseNot(state));
  }
  return left;
}

function parseCompare(state) {
  let compareOps = ['=', '!=', '<', '>', '<=', '>=', '=~', '!=~'];
  let node = parseAdd(state);

  while (1) {
    var tok = nextToken(state);

    if (!tok) {
      break;
    } else if (compareOps.indexOf(tok.value) !== -1) {
      node = new nodes.BinOp(
        tok.lineno,
        tok.colno,
        tok.value,
        node,
        parseAdd(state)
      );
    } else {
      pushToken(state, tok);
      break;
    }
  }

  return node;
}

function parseAdd(state) {
  let left = parseSub(state);
  while (skipValue(state, types.TOKEN_OPERATOR, '+')) {
    const right = parseSub(state);
    left = new nodes.BinOp(left.lineno, left.colno, '+', left, right);
  }
  return left;
}

function parseSub(state) {
  let left = parseMul(state);
  while (skipValue(state, types.TOKEN_OPERATOR, '-')) {
    const right = parseMul(state);
    left = new nodes.BinOp(left.lineno, left.colno, '-', left, right);
  }
  return left;
}

function parseMul(state) {
  let left = parseDiv(state);
  while (skipValue(state, types.TOKEN_OPERATOR, '*')) {
    const right = parseDiv(state);
    left = new nodes.BinOp(left.lineno, left.colno, '*', left, right);
  }
  return left;
}

function parseDiv(state) {
  let left = parseUnary(state);
  while (skipValue(state, types.TOKEN_OPERATOR, '/')) {
    const right = parseUnary(state);
    left = new nodes.BinOp(left.lineno, left.colno, '/', left, right);
  }
  return left;
}

function parseUnary(state) {
  var tok = peekToken(state);

  if (skipValue(state, types.TOKEN_OPERATOR, '-')) {
    const nextTok = peekToken(state);
    if (nextTok.type === types.TOKEN_INT) {
      const number = parseInt(nextToken(state).value);
      return new nodes.Literal(tok.lineno, tok.colno, -number);
    } else if (nextTok.type === types.TOKEN_FLOAT) {
      const number = parseFloat(nextToken(state).value);
      return new nodes.Literal(tok.lineno, tok.colno, -number);
    }

    return new nodes.UnaryOp(tok.lineno, tok.colno, '-', parseUnary(state));
  }
  return parsePrimary(state);
}

function parsePrimary(state) {
  var tok = nextToken(state);
  var val = null;

  if (!tok) {
    fail(state, 'expected expression, got end of file');
  } else if (tok.type === types.TOKEN_STRING) {
    val = tok.value;
  } else if (tok.type === types.TOKEN_INT) {
    val = parseInt(tok.value, 10);
  } else if (tok.type === types.TOKEN_FLOAT) {
    val = parseFloat(tok.value);
  } else if (tok.type === types.TOKEN_BOOLEAN) {
    if (tok.value === 'true') {
      val = true;
    } else if (tok.value === 'false') {
      val = false;
    }
  }

  if (val !== null) {
    return new nodes.Literal(tok.lineno, tok.colno, val);
  } else if (tok.type === types.TOKEN_SYMBOL) {
    if (tok.value === 'from') {
      return parseQueryExpression(state);
    } else if (tok.value === 'if') {
      return parseIfExpression(state);
    }

    return parsePostfix(
      state,
      new nodes.Symbol(tok.lineno, tok.colno, tok.value)
    );
  } else if (tok.type === types.TOKEN_LEFT_PAREN) {
    const node = parseExpression(state);
    expect(state, types.TOKEN_RIGHT_PAREN);
    return node;
  }

  fail(state, 'Unexpected token: ' + tok.value, tok.lineno, tok.colno);
}

function parseIfExpression(state) {
  const tok = expect(state, types.TOKEN_LEFT_PAREN);
  const cond = parseExpression(state);
  expect(state, types.TOKEN_RIGHT_PAREN);

  expect(state, types.TOKEN_LEFT_CURLY);
  const body = parseExpression(state);
  expect(state, types.TOKEN_RIGHT_CURLY);

  let else_;
  if (skipSymbol(state, 'else')) {
    expect(state, types.TOKEN_LEFT_CURLY);
    else_ = parseExpression(state);
    expect(state, types.TOKEN_RIGHT_CURLY);
  }

  return new nodes.If(tok.lineno, tok.colno, cond, body, else_);
}

function parseQueryExpression(state) {
  // The `from` keyword has already been parsed
  const tok = expect(state, types.TOKEN_SYMBOL);
  const table = tok.value;

  let where = null;
  if (skipSymbol(state, 'where')) {
    where = parseQuerySubExpression(state);
  }

  let groupby = null;
  if (skipSymbol(state, 'groupby')) {
    groupby = parseQuerySubExpression(state);
  }

  let select = [];
  let calculated;

  if (skipSymbol(state, 'select')) {
    let checkComma = false;
    calculated = false;

    expectValue(state, types.TOKEN_LEFT_CURLY, '{');

    while (!skipValue(state, types.TOKEN_RIGHT_CURLY, '}')) {
      const tok = peekToken(state);

      if (checkComma && !skip(state, types.TOKEN_COMMA)) {
        fail(
          state,
          'Unexpected token in query select: ' + tok.value,
          tok.lineno,
          tok.colno
        );
      }

      const expr = parseQuerySubExpression(state);
      let as = null;

      if (skipSymbol(state, 'as')) {
        const tok = expect(state, types.TOKEN_SYMBOL);
        as = tok.value;
      }

      select.push({ expr, as });

      checkComma = true;
    }
  } else if (skipSymbol(state, 'calculate')) {
    calculated = true;

    expectValue(state, types.TOKEN_LEFT_CURLY, '{');
    select.push({ expr: parseQuerySubExpression(state) });

    if (!skipValue(state, types.TOKEN_RIGHT_CURLY, '}')) {
      fail(state, 'Only one expression allowed for `calculate`');
    }
  } else {
    fail(state, 'Expected either the `select` or `calculate` keyword');
  }

  return new nodes.Query(
    tok.lineno,
    tok.colno,
    table,
    select,
    where,
    groupby,
    calculated
  );
}

function parseQuerySubExpression(state) {
  const node = parseExpression(state);
  return node;
}

function parsePostfix(state, node) {
  let tok;

  while ((tok = nextToken(state))) {
    if (tok.type === types.TOKEN_LEFT_PAREN) {
      pushToken(state, tok);
      let args = parseArgs(state);
      node = new nodes.FunCall(tok.lineno, tok.colno, node, args);
    } else if (tok.type === types.TOKEN_DOT) {
      const val = nextToken(state);
      node = new nodes.Member(
        tok.lineno,
        tok.colno,
        node,
        new nodes.Literal(val.lineno, val.colno, val.value)
      );
    } else if (tok.type === types.TOKEN_EXCLAIM) {
      const name = nextToken(state);
      if (name.type !== types.TOKEN_SYMBOL) {
        fail(
          state,
          'Expected cell name in sheet reference',
          name.lineno,
          name.colno
        );
      }

      return new nodes.Symbol(
        node.lineno,
        node.colno,
        node.value + '!' + name.value
      );
    } else {
      pushToken(state, tok);
      break;
    }
  }

  return node;
}

function parseArgs(state) {
  let tok = peekToken(state);

  if (tok.type !== types.TOKEN_LEFT_PAREN) {
    fail(state, 'Expected arguments', tok.lineno, tok.colno);
  }

  nextToken(state);

  let args = new nodes.NodeList(tok.lineno, tok.colno);
  let checkComma = false;

  while (1) {
    tok = peekToken(state);
    if (tok.type === types.TOKEN_RIGHT_PAREN) {
      nextToken(state);
      break;
    }

    if (checkComma && !skip(state, types.TOKEN_COMMA)) {
      fail(
        state,
        'Expected comma after function argument',
        tok.lineno,
        tok.colno
      );
    }

    args.addChild(parseExpression(state));
    checkComma = true;
  }

  return args;
}

export default function parse(src) {
  let state = {
    src: src,
    tokens: lex(src),
    peeked: null
  };

  if (state.tokens.is_finished()) {
    // If it's an empty string, return nothing
    return new nodes.Root(0, 0, []);
  } else {
    const expr = parseExpression(state);

    const tok = nextToken(state);
    if (tok) {
      fail(
        state,
        'Unexpected token after expression: ' + tok.value,
        tok.lineno,
        tok.colno
      );
    }

    return new nodes.Root(0, 0, [expr]);
  }
}
