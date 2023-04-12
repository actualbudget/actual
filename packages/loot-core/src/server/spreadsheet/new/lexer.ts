const whitespaceChars = new Set(' \n\t\r\u00A0');
const delimChars = new Set('()[]{}%*-+~/#,:|.<>=!');
const whitespaceAndDelimChars = new Set([...whitespaceChars, ...delimChars]);
const intChars = new Set('0123456789');

const complexOps = new Set(['==', '!=', '<=', '>=', '=~', '!=~']);

export const TOKEN_STRING = 'string';
export const TOKEN_WHITESPACE = 'whitespace';
export const TOKEN_LEFT_PAREN = 'left-paren';
export const TOKEN_RIGHT_PAREN = 'right-paren';
export const TOKEN_LEFT_BRACKET = 'left-bracket';
export const TOKEN_RIGHT_BRACKET = 'right-bracket';
export const TOKEN_LEFT_CURLY = 'left-curly';
export const TOKEN_RIGHT_CURLY = 'right-curly';
export const TOKEN_COMMA = 'comma';
export const TOKEN_INT = 'int';
export const TOKEN_FLOAT = 'float';
export const TOKEN_BOOLEAN = 'boolean';
export const TOKEN_SYMBOL = 'symbol';
export const TOKEN_DOT = 'dot';
export const TOKEN_EXCLAIM = 'exclaim';
export const TOKEN_OPERATOR = 'operator';

function token(type, value, lineno, colno) {
  return {
    type: type,
    value: value,
    lineno: lineno,
    colno: colno,
  };
}

class Tokenizer {
  colno;
  hasCheckedMode;
  index;
  len;
  lineno;
  str;

  constructor(str, opts = {}) {
    this.str = str;
    this.index = 0;
    this.len = str.length;
    this.lineno = 0;
    this.colno = 0;
    this.hasCheckedMode = false;
  }

  nextToken() {
    let lineno = this.lineno;
    let colno = this.colno;
    let tok;
    let cur = this.current();

    if (this.is_finished()) {
      return null;
    } else if ((tok = this._extract(whitespaceChars))) {
      // We hit some whitespace
      return token(TOKEN_WHITESPACE, tok, lineno, colno);
    } else if (!this.hasCheckedMode) {
      this.hasCheckedMode = true;

      if (cur === '=') {
        this.forward();
        cur = this.current();
        return this.nextToken();
      } else {
        this.index = this.str.length;
        return token(TOKEN_STRING, this.str, lineno, colno);
      }
      // eslint-disable-next-line rulesdir/typography
    } else if (cur === '"' || cur === "'") {
      // We've hit a string
      return token(TOKEN_STRING, this.parseString(cur), lineno, colno);
    } else if (delimChars.has(cur)) {
      // We've hit a delimiter (a special char like a bracket)
      let type;

      if (complexOps.has(cur + this.next() + this.next(2))) {
        cur = cur + this.next() + this.next(2);
        this.forward();
        this.forward();
      } else if (complexOps.has(cur + this.next())) {
        cur = cur + this.next();
        this.forward();
      }
      this.forward();

      switch (cur) {
        case '(':
          type = TOKEN_LEFT_PAREN;
          break;
        case ')':
          type = TOKEN_RIGHT_PAREN;
          break;
        case '[':
          type = TOKEN_LEFT_BRACKET;
          break;
        case ']':
          type = TOKEN_RIGHT_BRACKET;
          break;
        case '{':
          type = TOKEN_LEFT_CURLY;
          break;
        case '}':
          type = TOKEN_RIGHT_CURLY;
          break;
        case ',':
          type = TOKEN_COMMA;
          break;
        case '.':
          type = TOKEN_DOT;
          break;
        case '!':
          type = TOKEN_EXCLAIM;
          break;
        default:
          type = TOKEN_OPERATOR;
      }

      return token(type, cur, lineno, colno);
    } else {
      // We are not at whitespace or a delimiter, so extract the
      // text and parse it
      tok = this._extractUntil(whitespaceAndDelimChars);

      if (tok.match(/^[-+]?[0-9]+$/)) {
        if (this.current() === '.') {
          this.forward();
          let dec = this._extract(intChars);
          return token(TOKEN_FLOAT, tok + '.' + dec, lineno, colno);
        } else {
          return token(TOKEN_INT, tok, lineno, colno);
        }
      } else if (tok.match(/^(true|false)$/)) {
        return token(TOKEN_BOOLEAN, tok, lineno, colno);
      } else if (tok.match(/^(or|and|not)$/)) {
        return token(TOKEN_OPERATOR, tok, lineno, colno);
      } else if (tok) {
        return token(TOKEN_SYMBOL, tok, lineno, colno);
      } else {
        throw new Error('Unexpected value while parsing: ' + tok);
      }
    }
  }

  parseString(delimiter) {
    this.forward();

    let str = '';

    while (!this.is_finished() && this.current() !== delimiter) {
      let cur = this.current();

      if (cur === '\\') {
        this.forward();
        switch (this.current()) {
          case 'n':
            str += '\n';
            break;
          case 't':
            str += '\t';
            break;
          case 'r':
            str += '\r';
            break;
          default:
            str += this.current();
        }
        this.forward();
      } else {
        str += cur;
        this.forward();
      }
    }

    this.forward();
    return str;
  }

  _matches(str) {
    if (this.index + str.length > this.len) {
      return null;
    }

    let m = this.str.slice(this.index, this.index + str.length);
    return m === str;
  }

  _extractString(str) {
    if (this._matches(str)) {
      this.index += str.length;
      return str;
    }
    return null;
  }

  _extractUntil(chars) {
    // Extract all non-matching chars, with the default matching set
    // to everything
    return this._extractMatching(true, chars || new Set());
  }

  _extract(chars) {
    // Extract all matching chars (no default, so charString must be
    // explicit)
    return this._extractMatching(false, chars);
  }

  _extractMatching(breakOnMatch, chars) {
    // Pull out characters until a breaking char is hit.
    // If breakOnMatch is false, a non-matching char stops it.
    // If breakOnMatch is true, a matching char stops it.

    if (this.is_finished()) {
      return null;
    }

    let matches = chars.has(this.current());

    // Only proceed if the first character meets our condition
    if ((breakOnMatch && !matches) || (!breakOnMatch && matches)) {
      let t = this.current();
      this.forward();

      // And pull out all the chars one at a time until we hit a
      // breaking char
      let isMatch = chars.has(this.current());

      while (
        ((breakOnMatch && !isMatch) || (!breakOnMatch && isMatch)) &&
        !this.is_finished()
      ) {
        t += this.current();
        this.forward();

        isMatch = chars.has(this.current());
      }

      return t;
    }

    return '';
  }

  is_finished() {
    return this.index >= this.len;
  }

  forward() {
    this.index++;

    if (this.previous() === '\n') {
      this.lineno++;
      this.colno = 0;
    } else {
      this.colno++;
    }
  }

  back() {
    this.index--;

    if (this.current() === '\n') {
      this.lineno--;

      let idx = this.str.lastIndexOf('\n', this.index - 1);
      if (idx === -1) {
        this.colno = this.index;
      } else {
        this.colno = this.index - idx;
      }
    } else {
      this.colno--;
    }
  }

  // current returns current character
  current() {
    if (!this.is_finished()) {
      return this.str.charAt(this.index);
    }
    return '';
  }

  next(idx = 1) {
    if (this.index + idx < this.str.length) {
      return this.str.charAt(this.index + idx);
    }
    return '';
  }

  // currentStr returns what's left of the unparsed string
  currentStr() {
    if (!this.is_finished()) {
      return this.str.substr(this.index);
    }
    return '';
  }

  previous() {
    return this.str.charAt(this.index - 1);
  }
}

export default function lex(src, opts?: Record<string, unknown>) {
  return new Tokenizer(src, opts);
}
