import { compile } from './compiler';
import { MOV, CALL, QUERY, UOP, BOP, JUMPF, JUMPT } from './ops';

export default class VM {
  constructor(db, scopes) {
    this.stack = new Array(1000);
    this.reg1 = null;
    this.pc = 0;
    this.db = db;
    this.scopes = scopes;
  }

  get(ref) {
    if (ref && ref.type) {
      if (ref.type === '__reg') {
        return this.reg1;
      } else if (ref.type === '__var') {
        return this.scopes.getVariable(ref.name);
      } else if (ref.type === '__stack') {
        return this.stack[ref.index];
      }
    }

    return ref;
  }

  set(ref, value) {
    if (ref && ref.type) {
      if (ref.type === '__reg') {
        this.reg1 = this.get(value);
      } else if (ref.type === '__var') {
        this.scopes.setVariable(ref.name, this.get(value));
      } else if (ref.type === '__stack') {
        this.stack[ref.index] = this.get(value);
      }
    }
  }

  binaryOp(op, left, right) {
    switch (op) {
      case '+':
        // TODO: Enforce these to be numbers
        this.reg1 = this.get(left) + this.get(right);
        break;
      case '-':
        this.reg1 = this.get(left) - this.get(right);
        break;
      case '*':
        this.reg1 = this.get(left) * this.get(right);
        break;
      case '/':
        this.reg1 = this.get(left) / this.get(right);
        break;
      case 'and':
        this.reg1 = this.get(left) && this.get(right);
        break;
      case 'or':
        this.reg1 = this.get(left) || this.get(right);
        break;
      default:
        throw new Error('Unimplemented operator: ' + op);
    }
  }

  unaryOp(op, target) {
    switch (op) {
      case '-':
        this.reg1 = -this.get(target);
        break;
      default:
        throw new Error('Unimplemented operator: ' + op);
    }
  }

  call(callee, args) {
    const func = this.get(callee);
    this.reg1 = func.apply(
      null,
      args.map(arg => this.get(arg))
    );
  }

  query(sql, calculated) {
    this.pause(
      this.db.runQuery(sql, [], true).then(res => {
        if (calculated) {
          const keys = Object.keys(res[0]);
          return res[0][keys[0]];
        }
        return res;
      }),
      'Running sql: ' + sql
    );
  }

  jump(value, loc, { test }) {
    const result = this.get(value);
    const falsy = result === false || result === 0 || result === '';

    if ((test === 'true' && !falsy) || (test === 'false' && falsy)) {
      this.pc = loc.get();
    }
  }

  pause(promise, activityName) {
    this.paused = true;

    promise.then(
      val => {
        this.resume(val);
      },
      err => {
        console.log('VM caught error during activity: ' + activityName);
        console.log(err);
        this.resume(null);
      }
    );
  }

  resume(val) {
    this.reg1 = val;
    this.paused = false;
    this._run();
  }

  _run() {
    while (this.pc < this.ops.length) {
      const op = this.ops[this.pc];

      switch (op[0]) {
        case MOV:
          this.set(op[2], op[1]);
          break;
        case CALL:
          this.call(op[1], op[2]);
          break;
        case QUERY:
          this.query(op[1], op[2]);
          break;
        case BOP:
          this.binaryOp(op[1], op[2], op[3]);
          break;
        case UOP:
          this.unaryOp(op[1], op[2]);
          break;
        case JUMPF:
          this.jump(op[1], op[2], { test: 'false' });
          break;
        case JUMPT:
          this.jump(op[1], op[2], { test: 'true' });
          break;
        default:
          throw new Error('Unimplemented opcode: ' + op[0].toString());
      }

      this.pc++;

      if (this.paused) {
        break;
      }
    }

    if (this.pc === this.ops.length && this._onFinish) {
      this._onFinish(this.reg1);
    }
  }

  onFinish(func) {
    this._onFinish = func;
  }

  run(ops, onFinish) {
    this.pc = 0;
    this.ops = ops;
    this._onFinish = onFinish;
    this._run();
    return this.reg1;
  }

  runSource(src, onFinish) {
    const { ops } = compile(src);
    return this.run(ops, onFinish);
  }
}
