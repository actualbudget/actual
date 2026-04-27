//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['object-shorthand-properties'];

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

void runClassic(
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
          },
          {
            messageId: 'useShorthand',
            data: { key: 'bar' },
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
          },
          {
            messageId: 'useShorthand',
            data: { key: 'b' },
          },
          {
            messageId: 'useShorthand',
            data: { key: 'c' },
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
          },
          {
            messageId: 'useShorthand',
            data: { key: 'y' },
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
