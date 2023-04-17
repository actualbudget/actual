class Node {
  colno;
  fieldNames;
  lineno;

  constructor(lineno, colno, fieldNames) {
    this.lineno = lineno;
    this.colno = colno;
    this.fieldNames = fieldNames;
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
    super(lineno, colno, ['children']);
    this.children = nodes;
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
    super(lineno, colno, ['value']);
    this.value = value ?? null;
  }
  getTypeName() {
    return 'Value';
  }
}
export class UnaryOp extends Node {
  op;
  target;

  constructor(lineno, colno, op, target) {
    super(lineno, colno, ['op', 'target']);
    this.op = op ?? null;
    this.target = target ?? null;
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
    super(lineno, colno, ['op', 'left', 'right']);
    this.op = op ?? null;
    this.left = left ?? null;
    this.right = right ?? null;
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
    super(lineno, colno, ['callee', 'args']);
    this.callee = callee ?? null;
    this.args = args ?? null;
  }
  getTypeName() {
    return 'FunCall';
  }
}

export class Member extends Node {
  object;
  property;

  constructor(lineno, colno, object, property) {
    super(lineno, colno, ['object', 'property']);
    this.object = object ?? null;
    this.property = property ?? null;
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
    super(lineno, colno, ['table', 'select', 'where', 'groupby', 'calculated']);
    this.table = table ?? null;
    this.select = select ?? null;
    this.where = where ?? null;
    this.groupby = groupby ?? null;
    this.calculated = calculated ?? null;
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
    super(lineno, colno, ['cond', 'body', 'else_']);
    this.cond = cond ?? null;
    this.body = body ?? null;
    this.else_ = else_ ?? null;
  }
  getTypeName() {
    return 'If';
  }
}
