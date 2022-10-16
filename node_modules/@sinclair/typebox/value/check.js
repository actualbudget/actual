"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/value

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
exports.ValueCheck = exports.ValueCheckUnknownTypeError = void 0;
const Types = require("../typebox");
const format_1 = require("../format");
class ValueCheckUnknownTypeError extends Error {
    constructor(schema) {
        super('ValueCheck: Unknown type');
        this.schema = schema;
    }
}
exports.ValueCheckUnknownTypeError = ValueCheckUnknownTypeError;
var ValueCheck;
(function (ValueCheck) {
    function Any(schema, references, value) {
        return true;
    }
    function Array(schema, references, value) {
        if (!globalThis.Array.isArray(value)) {
            return false;
        }
        if (schema.minItems !== undefined && !(value.length >= schema.minItems)) {
            return false;
        }
        if (schema.maxItems !== undefined && !(value.length <= schema.maxItems)) {
            return false;
        }
        if (schema.uniqueItems === true && !(new Set(value).size === value.length)) {
            return false;
        }
        return value.every((val) => Visit(schema.items, references, val));
    }
    function Boolean(schema, references, value) {
        return typeof value === 'boolean';
    }
    function Constructor(schema, references, value) {
        return Visit(schema.returns, references, value.prototype);
    }
    function Function(schema, references, value) {
        return typeof value === 'function';
    }
    function Integer(schema, references, value) {
        if (!(typeof value === 'number')) {
            return false;
        }
        if (!globalThis.Number.isInteger(value)) {
            return false;
        }
        if (schema.multipleOf !== undefined && !(value % schema.multipleOf === 0)) {
            return false;
        }
        if (schema.exclusiveMinimum !== undefined && !(value > schema.exclusiveMinimum)) {
            return false;
        }
        if (schema.exclusiveMaximum !== undefined && !(value < schema.exclusiveMaximum)) {
            return false;
        }
        if (schema.minimum !== undefined && !(value >= schema.minimum)) {
            return false;
        }
        if (schema.maximum !== undefined && !(value <= schema.maximum)) {
            return false;
        }
        return true;
    }
    function Literal(schema, references, value) {
        return value === schema.const;
    }
    function Never(schema, references, value) {
        return false;
    }
    function Null(schema, references, value) {
        return value === null;
    }
    function Number(schema, references, value) {
        if (!(typeof value === 'number')) {
            return false;
        }
        if (schema.multipleOf && !(value % schema.multipleOf === 0)) {
            return false;
        }
        if (schema.exclusiveMinimum && !(value > schema.exclusiveMinimum)) {
            return false;
        }
        if (schema.exclusiveMaximum && !(value < schema.exclusiveMaximum)) {
            return false;
        }
        if (schema.minimum && !(value >= schema.minimum)) {
            return false;
        }
        if (schema.maximum && !(value <= schema.maximum)) {
            return false;
        }
        return true;
    }
    function Object(schema, references, value) {
        if (!(typeof value === 'object' && value !== null && !globalThis.Array.isArray(value))) {
            return false;
        }
        if (schema.minProperties !== undefined && !(globalThis.Object.keys(value).length >= schema.minProperties)) {
            return false;
        }
        if (schema.maxProperties !== undefined && !(globalThis.Object.keys(value).length <= schema.maxProperties)) {
            return false;
        }
        const propertyKeys = globalThis.Object.keys(schema.properties);
        if (schema.additionalProperties === false) {
            // optimization: If the property key length matches the required keys length
            // then we only need check that the values property key length matches that
            // of the property key length. This is because exhaustive testing for values
            // will occur in subsequent property tests.
            if (schema.required && schema.required.length === propertyKeys.length && !(globalThis.Object.keys(value).length === propertyKeys.length)) {
                return false;
            }
            else {
                if (!globalThis.Object.keys(value).every((key) => propertyKeys.includes(key))) {
                    return false;
                }
            }
        }
        for (const propertyKey of propertyKeys) {
            const propertySchema = schema.properties[propertyKey];
            if (schema.required && schema.required.includes(propertyKey)) {
                if (!Visit(propertySchema, references, value[propertyKey])) {
                    return false;
                }
            }
            else {
                if (value[propertyKey] !== undefined) {
                    if (!Visit(propertySchema, references, value[propertyKey])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    function Promise(schema, references, value) {
        return typeof value === 'object' && typeof value.then === 'function';
    }
    function Record(schema, references, value) {
        if (!(typeof value === 'object' && value !== null && !globalThis.Array.isArray(value))) {
            return false;
        }
        const [keyPattern, valueSchema] = globalThis.Object.entries(schema.patternProperties)[0];
        const regex = new RegExp(keyPattern);
        if (!globalThis.Object.keys(value).every((key) => regex.test(key))) {
            return false;
        }
        for (const propValue of globalThis.Object.values(value)) {
            if (!Visit(valueSchema, references, propValue))
                return false;
        }
        return true;
    }
    function Ref(schema, references, value) {
        const reference = references.find((reference) => reference.$id === schema.$ref);
        if (reference === undefined)
            throw new Error(`ValueCheck.Ref: Cannot find schema with $id '${schema.$ref}'.`);
        return Visit(reference, references, value);
    }
    function Self(schema, references, value) {
        const reference = references.find((reference) => reference.$id === schema.$ref);
        if (reference === undefined)
            throw new Error(`ValueCheck.Self: Cannot find schema with $id '${schema.$ref}'.`);
        return Visit(reference, references, value);
    }
    function String(schema, references, value) {
        if (!(typeof value === 'string')) {
            return false;
        }
        if (schema.minLength !== undefined) {
            if (!(value.length >= schema.minLength))
                return false;
        }
        if (schema.maxLength !== undefined) {
            if (!(value.length <= schema.maxLength))
                return false;
        }
        if (schema.pattern !== undefined) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value))
                return false;
        }
        if (schema.format !== undefined) {
            if (!format_1.Format.Has(schema.format))
                return false;
            const func = format_1.Format.Get(schema.format);
            return func(value);
        }
        return true;
    }
    function Tuple(schema, references, value) {
        if (!globalThis.Array.isArray(value)) {
            return false;
        }
        if (schema.items === undefined && !(value.length === 0)) {
            return false;
        }
        if (!(value.length === schema.maxItems)) {
            return false;
        }
        if (!schema.items) {
            return true;
        }
        for (let i = 0; i < schema.items.length; i++) {
            if (!Visit(schema.items[i], references, value[i]))
                return false;
        }
        return true;
    }
    function Undefined(schema, references, value) {
        return value === undefined;
    }
    function Union(schema, references, value) {
        return schema.anyOf.some((inner) => Visit(inner, references, value));
    }
    function Uint8Array(schema, references, value) {
        if (!(value instanceof globalThis.Uint8Array)) {
            return false;
        }
        if (schema.maxByteLength && !(value.length <= schema.maxByteLength)) {
            return false;
        }
        if (schema.minByteLength && !(value.length >= schema.minByteLength)) {
            return false;
        }
        return true;
    }
    function Unknown(schema, references, value) {
        return true;
    }
    function Void(schema, references, value) {
        return value === null;
    }
    function Visit(schema, references, value) {
        const anyReferences = schema.$id === undefined ? references : [schema, ...references];
        const anySchema = schema;
        switch (anySchema[Types.Kind]) {
            case 'Any':
                return Any(anySchema, anyReferences, value);
            case 'Array':
                return Array(anySchema, anyReferences, value);
            case 'Boolean':
                return Boolean(anySchema, anyReferences, value);
            case 'Constructor':
                return Constructor(anySchema, anyReferences, value);
            case 'Function':
                return Function(anySchema, anyReferences, value);
            case 'Integer':
                return Integer(anySchema, anyReferences, value);
            case 'Literal':
                return Literal(anySchema, anyReferences, value);
            case 'Never':
                return Never(anySchema, anyReferences, value);
            case 'Null':
                return Null(anySchema, anyReferences, value);
            case 'Number':
                return Number(anySchema, anyReferences, value);
            case 'Object':
                return Object(anySchema, anyReferences, value);
            case 'Promise':
                return Promise(anySchema, anyReferences, value);
            case 'Record':
                return Record(anySchema, anyReferences, value);
            case 'Ref':
                return Ref(anySchema, anyReferences, value);
            case 'Self':
                return Self(anySchema, anyReferences, value);
            case 'String':
                return String(anySchema, anyReferences, value);
            case 'Tuple':
                return Tuple(anySchema, anyReferences, value);
            case 'Undefined':
                return Undefined(anySchema, anyReferences, value);
            case 'Union':
                return Union(anySchema, anyReferences, value);
            case 'Uint8Array':
                return Uint8Array(anySchema, anyReferences, value);
            case 'Unknown':
                return Unknown(anySchema, anyReferences, value);
            case 'Void':
                return Void(anySchema, anyReferences, value);
            default:
                throw new ValueCheckUnknownTypeError(anySchema);
        }
    }
    // -------------------------------------------------------------------------
    // Check
    // -------------------------------------------------------------------------
    function Check(schema, references, value) {
        return schema.$id === undefined ? Visit(schema, references, value) : Visit(schema, [schema, ...references], value);
    }
    ValueCheck.Check = Check;
})(ValueCheck = exports.ValueCheck || (exports.ValueCheck = {}));
