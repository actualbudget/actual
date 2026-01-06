//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import * as rule from '../object-shorthand-properties';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

runClassic(
  'object-shorthand-properties',
  rule,
  {
    valid: [
      // Already using shorthand
      `const obj = { foo };`,
      `const obj = { foo, bar };`,
      `const obj = { foo, bar, baz };`,

      // Different key and value names
      `const obj = { foo: bar };`,
      `const obj = { foo: bar.baz };`,
      `const obj = { foo: 123 };`,
      `const obj = { foo: 'bar' };`,
      `const obj = { foo: true };`,
      `const obj = { foo: null };`,
      `const obj = { foo: undefined };`,

      // Methods (should not be enforced)
      `const obj = { foo() {} };`,
      `const obj = { foo: function() {} };`,
      `const obj = { foo: () => {} };`,

      // Computed properties
      `const obj = { [foo]: foo };`,
      `const obj = { [foo]: bar };`,

      // String/number keys
      `const obj = { 'foo': foo };`,
      `const obj = { 123: 123 };`,

      // Nested objects (shorthand should still be enforced in nested objects)
      `const obj = { foo: { bar } };`,
    ],

    invalid: [
      {
        code: 'const obj = { foo: foo };',
        output: 'const obj = { foo };',
        errors: [
          {
            messageId: 'useShorthand',
            data: { key: 'foo' },
            type: 'Property',
          },
        ],
      },
      {
        code: 'const obj = { foo: foo, bar: bar };',
        output: 'const obj = { foo, bar };',
        errors: [
          {
            messageId: 'useShorthand',
            data: { key: 'foo' },
            type: 'Property',
          },
          {
            messageId: 'useShorthand',
            data: { key: 'bar' },
            type: 'Property',
          },
        ],
      },
      {
        code: 'const obj = { foo: foo, bar: baz };',
        output: 'const obj = { foo, bar: baz };',
        errors: [
          {
            messageId: 'useShorthand',
            data: { key: 'foo' },
            type: 'Property',
          },
        ],
      },
      {
        code: 'const obj = { a: a, b: b, c: c };',
        output: 'const obj = { a, b, c };',
        errors: [
          {
            messageId: 'useShorthand',
            data: { key: 'a' },
            type: 'Property',
          },
          {
            messageId: 'useShorthand',
            data: { key: 'b' },
            type: 'Property',
          },
          {
            messageId: 'useShorthand',
            data: { key: 'c' },
            type: 'Property',
          },
        ],
      },
      {
        code: 'function test() { return { x: x, y: y }; }',
        output: 'function test() { return { x, y }; }',
        errors: [
          {
            messageId: 'useShorthand',
            data: { key: 'x' },
            type: 'Property',
          },
          {
            messageId: 'useShorthand',
            data: { key: 'y' },
            type: 'Property',
          },
        ],
      },
      {
        code: 'const obj = { prop: prop, method() {} };',
        output: 'const obj = { prop, method() {} };',
        errors: [
          {
            messageId: 'useShorthand',
            data: { key: 'prop' },
            type: 'Property',
          },
        ],
      },
      {
        code: 'const obj = { foo: { bar: bar } };',
        output: 'const obj = { foo: { bar } };',
        errors: [
          {
            messageId: 'useShorthand',
            data: { key: 'bar' },
            type: 'Property',
          },
        ],
      },
      {
        code: 'const obj = { ...other, foo: foo };',
        output: 'const obj = { ...other, foo };',
        errors: [
          {
            messageId: 'useShorthand',
            data: { key: 'foo' },
            type: 'Property',
          },
        ],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2020,
      ecmaFeatures: { jsx: true },
    },
  },
);
