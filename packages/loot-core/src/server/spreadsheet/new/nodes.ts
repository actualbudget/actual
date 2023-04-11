class Node {
  colno;
  fieldNames;
  lineno;

  constructor(lineno, colno, fieldNames, ...fields) {
    this.lineno = lineno;
    this.colno = colno;
    this.fieldNames = fieldNames;

    for (let i = 0; i < fields.length; i++) {
      const val = fields[i];
      // Coerce undefined/null to null
      this[fieldNames[i]] = val == null ? null : val;
    }
  }

  getTypeName() {
    return 'Node';
  }

  traverseFields(onEnter, onExit) {
    const fieldNames = this.fieldNames;
    for (let i = 0; i < fieldNames.length; i++) {
      const val = this[fieldNames[i]];

      if (val instanceof Node) {
        const ret = val.traverse(onEnter, onExit);
        if (ret) {
          this[fieldNames[i]] = ret;
        }
      }
    }
  }

  traverse(onEnter, onExit) {
    if (onEnter) {
      const val = onEnter(this);
      if (val === true) {
        return;
      } else if (val != null) {
        return val;
      }
    }
    this.traverseFields(onEnter, onExit);
    onExit && onExit(this);
  }

  copy() {
    const inst = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this,
    );

    for (let i = 0; i < inst.fieldNames.length; i++) {
      const field = inst.fieldNames[i];
      if (inst[field] instanceof Node) {
        inst[field] = inst[field].copy();
      }
    }

    return inst;
  }
}

export class NodeList extends Node {
  children;

  constructor(lineno, colno, nodes: unknown[] = []) {
    super(lineno, colno, ['children'], nodes);
  }

  getTypeName() {
    return 'NodeList';
  }

  addChild(node) {
    this.children.push(node);
  }

  traverseFields(onEnter, onExit) {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].traverse(onEnter, onExit);
    }
  }
}

export class Root extends NodeList {
  getTypeName() {
    return 'Root';
  }
}
export class Value extends Node {
  value;

  constructor(lineno, colno, value) {
    super(lineno, colno, ['value'], value);
  }
  getTypeName() {
    return 'Value';
  }
}
export class UnaryOp extends Node {
  op;
  target;

  constructor(lineno, colno, op, value) {
    super(lineno, colno, ['op', 'target'], op, value);
  }
  getTypeName() {
    return 'UnaryOp';
  }
}
export class BinOp extends Node {
  op;
  left;
  right;

  constructor(lineno, colno, op, left, right) {
    super(lineno, colno, ['op', 'left', 'right'], op, left, right);
  }
  getTypeName() {
    return 'BinOp';
  }
}

export class Literal extends Value {
  getTypeName() {
    return 'Literal';
  }
}
export class Symbol extends Value {
  getTypeName() {
    return 'Symbol';
  }
}
export class FunCall extends Node {
  callee;
  args;

  constructor(lineno, colno, callee, args) {
    super(lineno, colno, ['callee', 'args'], callee, args);
  }
  getTypeName() {
    return 'FunCall';
  }
}

export class Member extends Node {
  object;
  property;

  constructor(lineno, colno, object, property) {
    super(lineno, colno, ['object', 'property'], object, property);
  }
  getTypeName() {
    return 'Member';
  }
}

export class Query extends Node {
  table;
  select;
  where;
  groupby;
  calculated;

  constructor(lineno, colno, table, select, where, groupby, calculated) {
    super(
      lineno,
      colno,
      ['table', 'select', 'where', 'groupby', 'calculated'],
      table,
      select,
      where,
      groupby,
      calculated,
    );
  }
  getTypeName() {
    return 'Query';
  }
}

export class If extends Node {
  cond;
  body;
  else_;

  constructor(lineno, colno, cond, body, else_) {
    super(lineno, colno, ['cond', 'body', 'else_'], cond, body, else_);
  }
  getTypeName() {
    return 'If';
  }
}
