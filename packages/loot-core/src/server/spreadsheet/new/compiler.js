import getSqlFields from './get-sql-fields';
import * as nodes from './nodes';
import {
  MOV,
  CALL,
  QUERY,
  UOP,
  BOP,
  REG1,
  SP,
  VAR,
  JUMPF,
  JUMPT,
  LABEL
} from './ops';
import parse from './parser';
import generateSql from './sqlgen';

class Compiler {
  constructor() {
    this.ops = [];
    this.dependencies = [];
    this.sqlDependencies = [];
  }

  fail(msg, lineno, colno) {
    const lines = this.src.split('\n');

    let space = '';
    for (let i = 0; i < colno; i++) {
      space += ' ';
    }

    throw new Error(
      `[${lineno + 1}, ${colno + 1}] ${msg}:\n${lines[lineno]}\n${space}^`
    );
  }

  resolveVariable(name) {
    if (name.indexOf('!') === -1) {
      return this.scopeName + '!' + name;
    }
    return name;
  }

  maybePushStack(node, si) {
    if (node instanceof nodes.Symbol) {
      // There's no need to push anything to the stack since it's a
      // direct variable reference. Just store the referenced variable
      // and pop the symbol operation off the stack.
      const op = this.ops.pop();
      return [si, op[1]];
    }

    this.ops.push([MOV, REG1, SP(si)]);
    return [si + 1, SP(si)];
  }

  compileLiteral(node, si) {
    this.ops.push([MOV, node.value, REG1]);
  }

  compileSymbol(node, si) {
    const resolved = this.resolveVariable(node.value);
    this.dependencies.push(resolved);
    this.ops.push([MOV, VAR(resolved), REG1]);
  }

  compileBinOp(node, si) {
    this.compile(node.left, si);
    // TODO: Get rid of all this and add a second pass which optimizes
    // the opcodes.
    let left;
    [si, left] = this.maybePushStack(node.left, si);

    this.compile(node.right, si + 1);
    this.ops.push([BOP, node.op, left, REG1]);
  }

  compileUnaryOp(node, si) {
    this.compile(node.target, si);
    this.ops.push([UOP, node.op, REG1]);
  }

  compileFunCall(node, si) {
    this.compile(node.callee, si);
    let callee;
    [si, callee] = this.maybePushStack(node.callee, si);

    const args = node.args.children.map((arg, i) => {
      this.compile(arg, si + i);
      this.ops.push([MOV, REG1, SP(si + i)]);
      return SP(si + i);
    });

    this.ops.push([CALL, callee, args]);
  }

  compileQuery(node, si) {
    let fields = getSqlFields(node.table, node.where)
      .concat(getSqlFields(node.table, node.groupby))
      .concat(...node.select.map(s => getSqlFields(node.table, s.expr)));

    const { sql, where } = generateSql(
      node.table,
      node.where,
      node.groupby,
      node.select
    );

    // TODO: This is a hack, but I'm pretty sure we can get rid of all
    // of this. Just need to think through it.
    fields = fields.map(f => (f === '__cm.transferId' ? 'category' : f));

    // Uniquify them
    fields = [...new Set(fields)];

    this.sqlDependencies.push({ table: node.table, where, fields });
    this.ops.push([QUERY, sql, node.calculated]);
  }

  compileIf(node, si) {
    const L0 = LABEL();
    const L1 = LABEL();

    this.compile(node.cond, si);
    this.ops.push([MOV, REG1, SP(si)]);

    this.ops.push([JUMPF, SP(si), L0]);
    this.compile(node.body, si + 1);

    this.ops.push([JUMPT, SP(si), L1]);
    L0.resolve(this.ops.length - 1);
    this.compile(node.else_, si + 1);
    L1.resolve(this.ops.length - 1);
  }

  compileRoot(node, si) {
    node.children.forEach(node => {
      this.compile(node, si);
    });
  }

  compile(node, si) {
    const method = this['compile' + node.getTypeName()];
    if (!method) {
      this.fail(
        'Unknown node type: ' + node.getTypeName(),
        node.lineno,
        node.colno
      );
    }
    return method.call(this, node, si);
  }

  compileSource(binding, scopeName, src) {
    this.src = src;
    this.scopeName = scopeName;
    this.binding = binding;

    this.compile(parse(src), 0);

    const resolvedBinding = this.resolveVariable(binding);

    if (this.ops.length !== 0) {
      this.ops.push([MOV, REG1, VAR(resolvedBinding)]);
    } else {
      this.ops.push([MOV, '', VAR(resolvedBinding)]);
    }

    return {
      ops: this.ops,
      dependencies: this.dependencies,
      sqlDependencies: this.sqlDependencies
    };
  }
}

export function compile(src) {
  return compileBinding('result', 'generated', src);
}

export function compileBinding(binding, scopeName, src) {
  const compiler = new Compiler();
  return compiler.compileSource(binding, scopeName, src);
}
