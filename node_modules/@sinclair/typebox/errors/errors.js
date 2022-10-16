"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/errors

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
exports.ValueErrors = exports.ValueErrorsUnknownTypeError = exports.ValueErrorType = void 0;
const Types = require("../typebox");
const index_1 = require("../format/index");
// -------------------------------------------------------------------
// ValueErrorType
// -------------------------------------------------------------------
var ValueErrorType;
(function (ValueErrorType) {
    ValueErrorType[ValueErrorType["Array"] = 0] = "Array";
    ValueErrorType[ValueErrorType["ArrayMinItems"] = 1] = "ArrayMinItems";
    ValueErrorType[ValueErrorType["ArrayMaxItems"] = 2] = "ArrayMaxItems";
    ValueErrorType[ValueErrorType["ArrayUniqueItems"] = 3] = "ArrayUniqueItems";
    ValueErrorType[ValueErrorType["Boolean"] = 4] = "Boolean";
    ValueErrorType[ValueErrorType["Function"] = 5] = "Function";
    ValueErrorType[ValueErrorType["Integer"] = 6] = "Integer";
    ValueErrorType[ValueErrorType["IntegerMultipleOf"] = 7] = "IntegerMultipleOf";
    ValueErrorType[ValueErrorType["IntegerExclusiveMinimum"] = 8] = "IntegerExclusiveMinimum";
    ValueErrorType[ValueErrorType["IntegerExclusiveMaximum"] = 9] = "IntegerExclusiveMaximum";
    ValueErrorType[ValueErrorType["IntegerMinimum"] = 10] = "IntegerMinimum";
    ValueErrorType[ValueErrorType["IntegerMaximum"] = 11] = "IntegerMaximum";
    ValueErrorType[ValueErrorType["Literal"] = 12] = "Literal";
    ValueErrorType[ValueErrorType["Never"] = 13] = "Never";
    ValueErrorType[ValueErrorType["Null"] = 14] = "Null";
    ValueErrorType[ValueErrorType["Number"] = 15] = "Number";
    ValueErrorType[ValueErrorType["NumberMultipleOf"] = 16] = "NumberMultipleOf";
    ValueErrorType[ValueErrorType["NumberExclusiveMinimum"] = 17] = "NumberExclusiveMinimum";
    ValueErrorType[ValueErrorType["NumberExclusiveMaximum"] = 18] = "NumberExclusiveMaximum";
    ValueErrorType[ValueErrorType["NumberMinumum"] = 19] = "NumberMinumum";
    ValueErrorType[ValueErrorType["NumberMaximum"] = 20] = "NumberMaximum";
    ValueErrorType[ValueErrorType["Object"] = 21] = "Object";
    ValueErrorType[ValueErrorType["ObjectMinProperties"] = 22] = "ObjectMinProperties";
    ValueErrorType[ValueErrorType["ObjectMaxProperties"] = 23] = "ObjectMaxProperties";
    ValueErrorType[ValueErrorType["ObjectAdditionalProperties"] = 24] = "ObjectAdditionalProperties";
    ValueErrorType[ValueErrorType["Promise"] = 25] = "Promise";
    ValueErrorType[ValueErrorType["RecordKeyNumeric"] = 26] = "RecordKeyNumeric";
    ValueErrorType[ValueErrorType["RecordKeyString"] = 27] = "RecordKeyString";
    ValueErrorType[ValueErrorType["String"] = 28] = "String";
    ValueErrorType[ValueErrorType["StringMinLength"] = 29] = "StringMinLength";
    ValueErrorType[ValueErrorType["StringMaxLength"] = 30] = "StringMaxLength";
    ValueErrorType[ValueErrorType["StringPattern"] = 31] = "StringPattern";
    ValueErrorType[ValueErrorType["StringFormatUnknown"] = 32] = "StringFormatUnknown";
    ValueErrorType[ValueErrorType["StringFormat"] = 33] = "StringFormat";
    ValueErrorType[ValueErrorType["TupleZeroLength"] = 34] = "TupleZeroLength";
    ValueErrorType[ValueErrorType["TupleLength"] = 35] = "TupleLength";
    ValueErrorType[ValueErrorType["Undefined"] = 36] = "Undefined";
    ValueErrorType[ValueErrorType["Union"] = 37] = "Union";
    ValueErrorType[ValueErrorType["Uint8Array"] = 38] = "Uint8Array";
    ValueErrorType[ValueErrorType["Uint8ArrayMinByteLength"] = 39] = "Uint8ArrayMinByteLength";
    ValueErrorType[ValueErrorType["Uint8ArrayMaxByteLength"] = 40] = "Uint8ArrayMaxByteLength";
    ValueErrorType[ValueErrorType["Void"] = 41] = "Void";
})(ValueErrorType = exports.ValueErrorType || (exports.ValueErrorType = {}));
// -------------------------------------------------------------------
// ValueErrors
// -------------------------------------------------------------------
class ValueErrorsUnknownTypeError extends Error {
    constructor(schema) {
        super('ValueErrors: Unknown type');
        this.schema = schema;
    }
}
exports.ValueErrorsUnknownTypeError = ValueErrorsUnknownTypeError;
var ValueErrors;
(function (ValueErrors) {
    function* Any(schema, references, path, value) { }
    function* Array(schema, references, path, value) {
        if (!globalThis.Array.isArray(value)) {
            return yield { type: ValueErrorType.Array, schema, path, value, message: `Expected array` };
        }
        if (schema.minItems !== undefined && !(value.length >= schema.minItems)) {
            yield { type: ValueErrorType.ArrayMinItems, schema, path, value, message: `Expected array length to be greater or equal to ${schema.minItems}` };
        }
        if (schema.maxItems !== undefined && !(value.length <= schema.maxItems)) {
            yield { type: ValueErrorType.ArrayMinItems, schema, path, value, message: `Expected array length to be less or equal to ${schema.maxItems}` };
        }
        if (schema.uniqueItems === true && !(new Set(value).size === value.length)) {
            yield { type: ValueErrorType.ArrayUniqueItems, schema, path, value, message: `Expected array elements to be unique` };
        }
        for (let i = 0; i < value.length; i++) {
            yield* Visit(schema.items, references, `${path}/${i}`, value[i]);
        }
    }
    function* Boolean(schema, references, path, value) {
        if (!(typeof value === 'boolean')) {
            return yield { type: ValueErrorType.Boolean, schema, path, value, message: `Expected boolean` };
        }
    }
    function* Constructor(schema, references, path, value) {
        yield* Visit(schema.returns, references, path, value.prototype);
    }
    function* Function(schema, references, path, value) {
        if (!(typeof value === 'function')) {
            return yield { type: ValueErrorType.Function, schema, path, value, message: `Expected function` };
        }
    }
    function* Integer(schema, references, path, value) {
        if (!(typeof value === 'number')) {
            return yield { type: ValueErrorType.Number, schema, path, value, message: `Expected number` };
        }
        if (!globalThis.Number.isInteger(value)) {
            yield { type: ValueErrorType.Integer, schema, path, value, message: `Expected integer` };
        }
        if (schema.multipleOf && !(value % schema.multipleOf === 0)) {
            yield { type: ValueErrorType.IntegerMultipleOf, schema, path, value, message: `Expected integer to be a multiple of ${schema.multipleOf}` };
        }
        if (schema.exclusiveMinimum && !(value > schema.exclusiveMinimum)) {
            yield { type: ValueErrorType.IntegerExclusiveMinimum, schema, path, value, message: `Expected integer to be greater than ${schema.exclusiveMinimum}` };
        }
        if (schema.exclusiveMaximum && !(value < schema.exclusiveMaximum)) {
            yield { type: ValueErrorType.IntegerExclusiveMaximum, schema, path, value, message: `Expected integer to be less than ${schema.exclusiveMaximum}` };
        }
        if (schema.minimum && !(value >= schema.minimum)) {
            yield { type: ValueErrorType.IntegerMinimum, schema, path, value, message: `Expected integer to be greater or equal to ${schema.minimum}` };
        }
        if (schema.maximum && !(value <= schema.maximum)) {
            yield { type: ValueErrorType.IntegerMaximum, schema, path, value, message: `Expected integer to be less or equal to ${schema.maximum}` };
        }
    }
    function* Literal(schema, references, path, value) {
        if (!(value === schema.const)) {
            const error = typeof schema.const === 'string' ? `'${schema.const}'` : schema.const;
            return yield { type: ValueErrorType.Literal, schema, path, value, message: `Expected ${error}` };
        }
    }
    function* Never(schema, references, path, value) {
        yield { type: ValueErrorType.Never, schema, path, value, message: `Value cannot be validated` };
    }
    function* Null(schema, references, path, value) {
        if (!(value === null)) {
            return yield { type: ValueErrorType.Null, schema, path, value, message: `Expected null` };
        }
    }
    function* Number(schema, references, path, value) {
        if (!(typeof value === 'number')) {
            return yield { type: ValueErrorType.Number, schema, path, value, message: `Expected number` };
        }
        if (schema.multipleOf && !(value % schema.multipleOf === 0)) {
            yield { type: ValueErrorType.NumberMultipleOf, schema, path, value, message: `Expected number to be a multiple of ${schema.multipleOf}` };
        }
        if (schema.exclusiveMinimum && !(value > schema.exclusiveMinimum)) {
            yield { type: ValueErrorType.NumberExclusiveMinimum, schema, path, value, message: `Expected number to be greater than ${schema.exclusiveMinimum}` };
        }
        if (schema.exclusiveMaximum && !(value < schema.exclusiveMaximum)) {
            yield { type: ValueErrorType.NumberExclusiveMaximum, schema, path, value, message: `Expected number to be less than ${schema.exclusiveMaximum}` };
        }
        if (schema.minimum && !(value >= schema.minimum)) {
            yield { type: ValueErrorType.NumberMaximum, schema, path, value, message: `Expected number to be greater or equal to ${schema.minimum}` };
        }
        if (schema.maximum && !(value <= schema.maximum)) {
            yield { type: ValueErrorType.NumberMinumum, schema, path, value, message: `Expected number to be less or equal to ${schema.maximum}` };
        }
    }
    function* Object(schema, references, path, value) {
        if (!(typeof value === 'object' && value !== null && !globalThis.Array.isArray(value))) {
            return yield { type: ValueErrorType.Object, schema, path, value, message: `Expected object` };
        }
        if (schema.minProperties !== undefined && !(globalThis.Object.keys(value).length >= schema.minProperties)) {
            yield { type: ValueErrorType.ObjectMinProperties, schema, path, value, message: `Expected object to have at least ${schema.minProperties} properties` };
        }
        if (schema.maxProperties !== undefined && !(globalThis.Object.keys(value).length <= schema.maxProperties)) {
            yield { type: ValueErrorType.ObjectMaxProperties, schema, path, value, message: `Expected object to have less than ${schema.minProperties} properties` };
        }
        const propertyKeys = globalThis.Object.keys(schema.properties);
        if (schema.additionalProperties === false) {
            for (const propKey of globalThis.Object.keys(value)) {
                if (!propertyKeys.includes(propKey)) {
                    yield { type: ValueErrorType.ObjectAdditionalProperties, schema, path: `${path}/${propKey}`, value: value[propKey], message: 'Unexpected property' };
                }
            }
        }
        for (const propertyKey of propertyKeys) {
            const propertySchema = schema.properties[propertyKey];
            if (schema.required && schema.required.includes(propertyKey)) {
                yield* Visit(propertySchema, references, `${path}/${propertyKey}`, value[propertyKey]);
            }
            else {
                if (value[propertyKey] !== undefined) {
                    yield* Visit(propertySchema, references, `${path}/${propertyKey}`, value[propertyKey]);
                }
            }
        }
    }
    function* Promise(schema, references, path, value) {
        if (!(typeof value === 'object' && typeof value.then === 'function')) {
            yield { type: ValueErrorType.Promise, schema, path, value, message: `Expected Promise` };
        }
    }
    function* Record(schema, references, path, value) {
        if (!(typeof value === 'object' && value !== null && !globalThis.Array.isArray(value))) {
            return yield { type: ValueErrorType.Object, schema, path, value, message: `Expected object` };
        }
        const [keyPattern, valueSchema] = globalThis.Object.entries(schema.patternProperties)[0];
        const regex = new RegExp(keyPattern);
        if (!globalThis.Object.keys(value).every((key) => regex.test(key))) {
            const numeric = keyPattern === '^(0|[1-9][0-9]*)$';
            const type = numeric ? ValueErrorType.RecordKeyNumeric : ValueErrorType.RecordKeyString;
            const message = numeric ? 'Expected all object property keys to be numeric' : 'Expected all object property keys to be strings';
            return yield { type, schema, path, value, message };
        }
        for (const [propKey, propValue] of globalThis.Object.entries(value)) {
            yield* Visit(valueSchema, references, `${path}/${propKey}`, propValue);
        }
    }
    function* Ref(schema, references, path, value) {
        const reference = references.find((reference) => reference.$id === schema.$ref);
        if (reference === undefined)
            throw new Error(`ValueErrors.Ref: Cannot find schema with $id '${schema.$ref}'.`);
        yield* Visit(reference, references, path, value);
    }
    function* Self(schema, references, path, value) {
        const reference = references.find((reference) => reference.$id === schema.$ref);
        if (reference === undefined)
            throw new Error(`ValueErrors.Self: Cannot find schema with $id '${schema.$ref}'.`);
        yield* Visit(reference, references, path, value);
    }
    function* String(schema, references, path, value) {
        if (!(typeof value === 'string')) {
            return yield { type: ValueErrorType.String, schema, path, value, message: 'Expected string' };
        }
        if (schema.minLength !== undefined && !(value.length >= schema.minLength)) {
            yield { type: ValueErrorType.StringMinLength, schema, path, value, message: `Expected string length greater or equal to ${schema.minLength}` };
        }
        if (schema.maxLength !== undefined && !(value.length <= schema.maxLength)) {
            yield { type: ValueErrorType.StringMaxLength, schema, path, value, message: `Expected string length less or equal to ${schema.maxLength}` };
        }
        if (schema.pattern !== undefined) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value)) {
                yield { type: ValueErrorType.StringPattern, schema, path, value, message: `Expected string to match pattern ${schema.pattern}` };
            }
        }
        if (schema.format !== undefined) {
            if (!index_1.Format.Has(schema.format)) {
                yield { type: ValueErrorType.StringFormatUnknown, schema, path, value, message: `Unknown string format '${schema.format}'` };
            }
            else {
                const format = index_1.Format.Get(schema.format);
                if (!format(value)) {
                    yield { type: ValueErrorType.StringFormat, schema, path, value, message: `Expected string to match format '${schema.format}'` };
                }
            }
        }
    }
    function* Tuple(schema, references, path, value) {
        if (!globalThis.Array.isArray(value)) {
            return yield { type: ValueErrorType.Array, schema, path, value, message: 'Expected Array' };
        }
        if (schema.items === undefined && !(value.length === 0)) {
            return yield { type: ValueErrorType.TupleZeroLength, schema, path, value, message: 'Expected tuple to have 0 elements' };
        }
        if (!(value.length === schema.maxItems)) {
            yield { type: ValueErrorType.TupleLength, schema, path, value, message: `Expected tuple to have ${schema.maxItems} elements` };
        }
        if (!schema.items) {
            return;
        }
        for (let i = 0; i < schema.items.length; i++) {
            yield* Visit(schema.items[i], references, `${path}/${i}`, value[i]);
        }
    }
    function* Undefined(schema, references, path, value) {
        if (!(value === undefined)) {
            yield { type: ValueErrorType.Undefined, schema, path, value, message: `Expected undefined` };
        }
    }
    function* Union(schema, references, path, value) {
        const errors = [];
        for (const inner of schema.anyOf) {
            const variantErrors = [...Visit(inner, references, path, value)];
            if (variantErrors.length === 0)
                return;
            errors.push(...variantErrors);
        }
        for (const error of errors) {
            yield error;
        }
        if (errors.length > 0) {
            yield { type: ValueErrorType.Union, schema, path, value, message: 'Expected value of union' };
        }
    }
    function* Uint8Array(schema, references, path, value) {
        if (!(value instanceof globalThis.Uint8Array)) {
            return yield { type: ValueErrorType.Uint8Array, schema, path, value, message: `Expected Uint8Array` };
        }
        if (schema.maxByteLength && !(value.length <= schema.maxByteLength)) {
            yield { type: ValueErrorType.Uint8ArrayMaxByteLength, schema, path, value, message: `Expected Uint8Array to have a byte length less or equal to ${schema.maxByteLength}` };
        }
        if (schema.minByteLength && !(value.length >= schema.minByteLength)) {
            yield { type: ValueErrorType.Uint8ArrayMinByteLength, schema, path, value, message: `Expected Uint8Array to have a byte length greater or equal to ${schema.maxByteLength}` };
        }
    }
    function* Unknown(schema, references, path, value) { }
    function* Void(schema, references, path, value) {
        if (!(value === null)) {
            return yield { type: ValueErrorType.Void, schema, path, value, message: `Expected null` };
        }
    }
    function* Visit(schema, references, path, value) {
        const anyReferences = schema.$id === undefined ? references : [schema, ...references];
        const anySchema = schema;
        switch (anySchema[Types.Kind]) {
            case 'Any':
                return yield* Any(anySchema, anyReferences, path, value);
            case 'Array':
                return yield* Array(anySchema, anyReferences, path, value);
            case 'Boolean':
                return yield* Boolean(anySchema, anyReferences, path, value);
            case 'Constructor':
                return yield* Constructor(anySchema, anyReferences, path, value);
            case 'Function':
                return yield* Function(anySchema, anyReferences, path, value);
            case 'Integer':
                return yield* Integer(anySchema, anyReferences, path, value);
            case 'Literal':
                return yield* Literal(anySchema, anyReferences, path, value);
            case 'Never':
                return yield* Never(anySchema, anyReferences, path, value);
            case 'Null':
                return yield* Null(anySchema, anyReferences, path, value);
            case 'Number':
                return yield* Number(anySchema, anyReferences, path, value);
            case 'Object':
                return yield* Object(anySchema, anyReferences, path, value);
            case 'Promise':
                return yield* Promise(anySchema, anyReferences, path, value);
            case 'Record':
                return yield* Record(anySchema, anyReferences, path, value);
            case 'Ref':
                return yield* Ref(anySchema, anyReferences, path, value);
            case 'Self':
                return yield* Self(anySchema, anyReferences, path, value);
            case 'String':
                return yield* String(anySchema, anyReferences, path, value);
            case 'Tuple':
                return yield* Tuple(anySchema, anyReferences, path, value);
            case 'Undefined':
                return yield* Undefined(anySchema, anyReferences, path, value);
            case 'Union':
                return yield* Union(anySchema, anyReferences, path, value);
            case 'Uint8Array':
                return yield* Uint8Array(anySchema, anyReferences, path, value);
            case 'Unknown':
                return yield* Unknown(anySchema, anyReferences, path, value);
            case 'Void':
                return yield* Void(anySchema, anyReferences, path, value);
            default:
                throw new ValueErrorsUnknownTypeError(schema);
        }
    }
    function* Errors(schema, references, value) {
        yield* Visit(schema, references, '', value);
    }
    ValueErrors.Errors = Errors;
})(ValueErrors = exports.ValueErrors || (exports.ValueErrors = {}));
