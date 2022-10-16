"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/compiler

The MIT License (MIT)

Copyright (c) 2022 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeCompiler = exports.TypeCompilerUnknownTypeError = exports.Property = exports.TypeCheck = void 0;
const index_1 = require("../errors/index");
const index_2 = require("../guard/index");
const index_3 = require("../format/index");
const Types = require("../typebox");
// -------------------------------------------------------------------
// TypeCheck
// -------------------------------------------------------------------
class TypeCheck {
    constructor(schema, references, checkFunc, code) {
        this.schema = schema;
        this.references = references;
        this.checkFunc = checkFunc;
        this.code = code;
    }
    /** Returns the generated validation code used to validate this type. */
    Code() {
        return this.code;
    }
    /** Returns an iterator for each error in this value. */
    Errors(value) {
        return index_1.ValueErrors.Errors(this.schema, this.references, value);
    }
    /** Returns true if the value matches the given type. */
    Check(value) {
        return this.checkFunc(value);
    }
}
exports.TypeCheck = TypeCheck;
// -------------------------------------------------------------------
// Property
// -------------------------------------------------------------------
var Property;
(function (Property) {
    function DollarSign(code) {
        return code === 36;
    }
    function Underscore(code) {
        return code === 95;
    }
    function Numeric(code) {
        return code >= 48 && code <= 57;
    }
    function Alpha(code) {
        return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    }
    function Check(propertyName) {
        if (propertyName.length === 0)
            return false;
        {
            const code = propertyName.charCodeAt(0);
            if (!(DollarSign(code) || Underscore(code) || Alpha(code))) {
                return false;
            }
        }
        for (let i = 1; i < propertyName.length; i++) {
            const code = propertyName.charCodeAt(i);
            if (!(DollarSign(code) || Underscore(code) || Alpha(code) || Numeric(code))) {
                return false;
            }
        }
        return true;
    }
    Property.Check = Check;
})(Property = exports.Property || (exports.Property = {}));
// -------------------------------------------------------------------
// TypeCompiler
// -------------------------------------------------------------------
class TypeCompilerUnknownTypeError extends Error {
    constructor(schema) {
        super('TypeCompiler: Unknown type');
        this.schema = schema;
    }
}
exports.TypeCompilerUnknownTypeError = TypeCompilerUnknownTypeError;
/** Compiles Types for Runtime Type Checking */
var TypeCompiler;
(function (TypeCompiler) {
    // -------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------
    function* Any(schema, value) {
        yield '(true)';
    }
    function* Array(schema, value) {
        const expression = CreateExpression(schema.items, 'value');
        if (schema.minItems !== undefined)
            yield `(${value}.length >= ${schema.minItems})`;
        if (schema.maxItems !== undefined)
            yield `(${value}.length <= ${schema.maxItems})`;
        if (schema.uniqueItems !== undefined)
            yield `(new Set(${value}).size === ${value}.length)`;
        yield `(Array.isArray(${value}) && ${value}.every(value => ${expression}))`;
    }
    function* Boolean(schema, value) {
        yield `(typeof ${value} === 'boolean')`;
    }
    function* Constructor(schema, value) {
        yield* Visit(schema.returns, `${value}.prototype`);
    }
    function* Function(schema, value) {
        yield `(typeof ${value} === 'function')`;
    }
    function* Integer(schema, value) {
        yield `(typeof ${value} === 'number' && Number.isInteger(${value}))`;
        if (schema.multipleOf !== undefined)
            yield `(${value} % ${schema.multipleOf} === 0)`;
        if (schema.exclusiveMinimum !== undefined)
            yield `(${value} > ${schema.exclusiveMinimum})`;
        if (schema.exclusiveMaximum !== undefined)
            yield `(${value} < ${schema.exclusiveMaximum})`;
        if (schema.minimum !== undefined)
            yield `(${value} >= ${schema.minimum})`;
        if (schema.maximum !== undefined)
            yield `(${value} <= ${schema.maximum})`;
    }
    function* Literal(schema, value) {
        if (typeof schema.const === 'number' || typeof schema.const === 'boolean') {
            yield `(${value} === ${schema.const})`;
        }
        else {
            yield `(${value} === '${schema.const}')`;
        }
    }
    function* Never(schema, value) {
        yield `(false)`;
    }
    function* Null(schema, value) {
        yield `(${value} === null)`;
    }
    function* Number(schema, value) {
        yield `(typeof ${value} === 'number')`;
        if (schema.multipleOf !== undefined)
            yield `(${value} % ${schema.multipleOf} === 0)`;
        if (schema.exclusiveMinimum !== undefined)
            yield `(${value} > ${schema.exclusiveMinimum})`;
        if (schema.exclusiveMaximum !== undefined)
            yield `(${value} < ${schema.exclusiveMaximum})`;
        if (schema.minimum !== undefined)
            yield `(${value} >= ${schema.minimum})`;
        if (schema.maximum !== undefined)
            yield `(${value} <= ${schema.maximum})`;
    }
    function* Object(schema, value) {
        yield `(typeof ${value} === 'object' && ${value} !== null && !Array.isArray(${value}))`;
        if (schema.minProperties !== undefined)
            yield `(Object.keys(${value}).length >= ${schema.minProperties})`;
        if (schema.maxProperties !== undefined)
            yield `(Object.keys(${value}).length <= ${schema.maxProperties})`;
        const propertyKeys = globalThis.Object.keys(schema.properties);
        if (schema.additionalProperties === false) {
            // Optimization: If the property key length matches the required keys length
            // then we only need check that the values property key length matches that
            // of the property key length. This is because exhaustive testing for values
            // will occur in subsequent property tests.
            if (schema.required && schema.required.length === propertyKeys.length) {
                yield `(Object.keys(${value}).length === ${propertyKeys.length})`;
            }
            else {
                const keys = `[${propertyKeys.map((key) => `'${key}'`).join(', ')}]`;
                yield `(Object.keys(${value}).every(key => ${keys}.includes(key)))`;
            }
        }
        for (const propertyKey of propertyKeys) {
            const memberExpression = Property.Check(propertyKey) ? `${value}.${propertyKey}` : `${value}['${propertyKey}']`;
            const propertySchema = schema.properties[propertyKey];
            if (schema.required && schema.required.includes(propertyKey)) {
                yield* Visit(propertySchema, memberExpression);
            }
            else {
                const expression = CreateExpression(propertySchema, memberExpression);
                yield `(${memberExpression} === undefined ? true : (${expression}))`;
            }
        }
    }
    function* Promise(schema, value) {
        yield `(typeof value === 'object' && typeof ${value}.then === 'function')`;
    }
    function* Record(schema, value) {
        yield `(typeof ${value} === 'object' && ${value} !== null && !Array.isArray(${value}))`;
        const [keyPattern, valueSchema] = globalThis.Object.entries(schema.patternProperties)[0];
        const local = PushLocal(`new RegExp(/${keyPattern}/)`);
        yield `(Object.keys(${value}).every(key => ${local}.test(key)))`;
        const expression = CreateExpression(valueSchema, 'value');
        yield `(Object.values(${value}).every(value => ${expression}))`;
    }
    function* Ref(schema, value) {
        // Reference: If we have seen this reference before we can just yield and return
        // the function call. If this isn't the case we defer to visit to generate and
        // set the function for subsequent passes. Consider for refactor.
        if (names.has(schema.$ref))
            return yield `(${CreateFunctionName(schema.$ref)}(${value}))`;
        if (!referenceMap.has(schema.$ref))
            throw Error(`TypeCompiler.Ref: Cannot de-reference schema with $id '${schema.$ref}'`);
        const reference = referenceMap.get(schema.$ref);
        yield* Visit(reference, value);
    }
    function* Self(schema, value) {
        const func = CreateFunctionName(schema.$ref);
        yield `(${func}(${value}))`;
    }
    function* String(schema, value) {
        yield `(typeof ${value} === 'string')`;
        if (schema.minLength !== undefined) {
            yield `(${value}.length >= ${schema.minLength})`;
        }
        if (schema.maxLength !== undefined) {
            yield `(${value}.length <= ${schema.maxLength})`;
        }
        if (schema.pattern !== undefined) {
            const local = PushLocal(`new RegExp(/${schema.pattern}/);`);
            yield `(${local}.test(${value}))`;
        }
        if (schema.format !== undefined) {
            yield `(format('${schema.format}', ${value}))`;
        }
    }
    function* Tuple(schema, value) {
        yield `(Array.isArray(${value}))`;
        if (schema.items === undefined)
            return yield `(${value}.length === 0)`;
        yield `(${value}.length === ${schema.maxItems})`;
        for (let i = 0; i < schema.items.length; i++) {
            const expression = CreateExpression(schema.items[i], `${value}[${i}]`);
            yield `(${expression})`;
        }
    }
    function* Undefined(schema, value) {
        yield `(${value} === undefined)`;
    }
    function* Union(schema, value) {
        const expressions = schema.anyOf.map((schema) => CreateExpression(schema, value));
        yield `(${expressions.join(' || ')})`;
    }
    function* Uint8Array(schema, value) {
        yield `(${value} instanceof Uint8Array)`;
        if (schema.maxByteLength)
            yield `(${value}.length <= ${schema.maxByteLength})`;
        if (schema.minByteLength)
            yield `(${value}.length >= ${schema.minByteLength})`;
    }
    function* Unknown(schema, value) {
        yield '(true)';
    }
    function* Void(schema, value) {
        yield `(${value} === null)`;
    }
    function* Visit(schema, value) {
        // Reference: Referenced schemas can originate from either additional schemas
        // or inline in the schema itself. Ideally the recursive path should align to
        // reference path. Consider for refactor.
        if (schema.$id && !names.has(schema.$id)) {
            names.add(schema.$id);
            const name = CreateFunctionName(schema.$id);
            const body = CreateFunction(name, schema, 'value');
            PushFunction(body);
            yield `(${name}(${value}))`;
            return;
        }
        const anySchema = schema;
        switch (anySchema[Types.Kind]) {
            case 'Any':
                return yield* Any(anySchema, value);
            case 'Array':
                return yield* Array(anySchema, value);
            case 'Boolean':
                return yield* Boolean(anySchema, value);
            case 'Constructor':
                return yield* Constructor(anySchema, value);
            case 'Function':
                return yield* Function(anySchema, value);
            case 'Integer':
                return yield* Integer(anySchema, value);
            case 'Literal':
                return yield* Literal(anySchema, value);
            case 'Never':
                return yield* Never(anySchema, value);
            case 'Null':
                return yield* Null(anySchema, value);
            case 'Number':
                return yield* Number(anySchema, value);
            case 'Object':
                return yield* Object(anySchema, value);
            case 'Promise':
                return yield* Promise(anySchema, value);
            case 'Record':
                return yield* Record(anySchema, value);
            case 'Ref':
                return yield* Ref(anySchema, value);
            case 'Self':
                return yield* Self(anySchema, value);
            case 'String':
                return yield* String(anySchema, value);
            case 'Tuple':
                return yield* Tuple(anySchema, value);
            case 'Undefined':
                return yield* Undefined(anySchema, value);
            case 'Union':
                return yield* Union(anySchema, value);
            case 'Uint8Array':
                return yield* Uint8Array(anySchema, value);
            case 'Unknown':
                return yield* Unknown(anySchema, value);
            case 'Void':
                return yield* Void(anySchema, value);
            default:
                throw new TypeCompilerUnknownTypeError(schema);
        }
    }
    // -------------------------------------------------------------------
    // Compile State
    // -------------------------------------------------------------------
    const referenceMap = new Map();
    const locals = new Set(); // local variables and functions
    const names = new Set(); // cache of local functions
    function ResetCompiler() {
        referenceMap.clear();
        locals.clear();
        names.clear();
    }
    function AddReferences(schemas = []) {
        for (const schema of schemas) {
            if (!schema.$id)
                throw new Error(`TypeCompiler: Referenced schemas must specify an $id.`);
            if (referenceMap.has(schema.$id))
                throw new Error(`TypeCompiler: Duplicate schema $id found for '${schema.$id}'`);
            referenceMap.set(schema.$id, schema);
        }
    }
    function CreateExpression(schema, value) {
        return [...Visit(schema, value)].join(' && ');
    }
    function CreateFunctionName($id) {
        return `check_${$id.replace(/-/g, '_')}`;
    }
    function CreateFunction(name, schema, value) {
        const expression = [...Visit(schema, value)].map((condition) => `    ${condition}`).join(' &&\n');
        return `function ${name}(value) {\n  return (\n${expression}\n )\n}`;
    }
    function PushFunction(functionBody) {
        locals.add(functionBody);
    }
    function PushLocal(expression) {
        const local = `local_${locals.size}`;
        locals.add(`const ${local} = ${expression}`);
        return local;
    }
    function GetLocals() {
        return [...locals.values()];
    }
    // -------------------------------------------------------------------
    // Compile
    // -------------------------------------------------------------------
    function Build(schema, references = []) {
        ResetCompiler();
        AddReferences(references);
        const check = CreateFunction('check', schema, 'value');
        const locals = GetLocals();
        return `${locals.join('\n')}\nreturn ${check}`;
    }
    /** Compiles the given type for runtime type checking. This compiler only accepts known TypeBox types non-inclusive of unsafe types. */
    function Compile(schema, references = []) {
        index_2.TypeGuard.Assert(schema, references);
        const code = Build(schema, references);
        const func1 = globalThis.Function('format', code);
        const func2 = func1((format, value) => {
            if (!index_3.Format.Has(format))
                return false;
            const func = index_3.Format.Get(format);
            return func(value);
        });
        return new TypeCheck(schema, references, func2, code);
    }
    TypeCompiler.Compile = Compile;
})(TypeCompiler = exports.TypeCompiler || (exports.TypeCompiler = {}));
