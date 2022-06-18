import { CompilerState } from "./types";

export class CompileError extends Error {
    constructor(message: string = "") {
      super(message);
  
      Object.setPrototypeOf(this, CompileError.prototype);
    }
}

type StackElement = {
    type: "expr" | "function" | "op" | "filter" | "select" | "groupBy" | "orderBy" | "value";
    value?: any;
    args?: any[];
}
type Tail<T extends any[]> = T extends [ x: any, ...xs: infer XS] ? XS : never;

export function saveStack<F extends (state: CompilerState, ...args: any[]) => any>(type: StackElement["type"], func: F): (state: CompilerState, ...args: Tail<Parameters<F>>) => ReturnType<F> {
    return (state: CompilerState, ...args: Tail<Parameters<F>>) => {
        if (state == null || state.compileStack == null) {
            throw new CompileError(
                'This function cannot track error data. ' +
                'It needs to accept the compiler state as the first argument.'
            );
        }

        state.compileStack.push({ type, args });
        let ret = func(state, ...args);
        state.compileStack.pop();
        return ret;
    };
}

function prettyValue(value: any): string {
    if (typeof value === 'string') {
        return value;
    } else if (value === undefined) {
        return 'undefined';
    }

    let str = JSON.stringify(value);
    if (str.length > 70) {
        let expanded = JSON.stringify(value, null, 2);
        return expanded.split('\n').join('\n  ');
    }
    return str;
}

export function getCompileError(error: CompileError, stack: StackElement[]): CompileError {
    if (stack.length === 0) {
        return error;
    }

    let stackStr = stack
        .slice(1)
        .reverse()
        .map(entry => {
        switch (entry.type) {
            case 'expr':
            case 'function':
                return prettyValue(entry.args[0]);
            case 'op': {
                let [fieldRef, opData] = entry.args;
                return prettyValue({ [fieldRef]: opData });
                }
            case 'value':
                return prettyValue(entry.value);
            default:
                return '';
        }
        })
        .map(str => '\n  ' + str)
        .join('');

    const rootMethod = stack[0].type;
    const methodArgs = stack[0].args[0];
    stackStr += `\n  ${rootMethod}(${prettyValue(
        methodArgs.length === 1 ? methodArgs[0] : methodArgs
    )})`;

    // In production, hide internal stack traces
    if (process.env.NODE_ENV === 'production') {
        const err = new CompileError();
        err.message = `${error.message}\n\nExpression stack:` + stackStr;
        err.stack = null;
        return err;
    }

    error.message = `${error.message}\n\nExpression stack:` + stackStr;
    return error;
}
