//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['prefer-if-statement'];

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

void runClassic(
  'prefer-if-statement',
  rule,
  {
    valid: [
      `if (foo && bar) { console.log('Hello, world!'); }`,
      `myFunc(foo && bar);`,
      `if (foo || bar) { console.log('Hello, world!'); }`,
      `myFunc(foo || bar);`,
      `if (foo ? bar : baz) { console.log('Hello, world!'); }`,
      `<div>{foo && bar}</div>`,
      `<div>{foo || bar}</div>`,
      `<div>{foo ? bar : baz}</div>`,
    ],

    invalid: [
      {
        code: 'foo && bar;',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: { op: '&&' },
          },
        ],
      },
      {
        code: 'foo || bar;',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: { op: '||' },
          },
        ],
      },
      {
        code: 'foo ? bar : baz;',
        output: null,
        errors: [{ messageId: 'ternary' }],
      },
      {
        code: 'function foo() { bar && baz; }',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: { op: '&&' },
          },
        ],
      },
      {
        code: 'function foo() { bar || baz; }',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: { op: '||' },
          },
        ],
      },
      {
        code: 'function foo() { bar ? baz : qux; }',
        output: null,
        errors: [{ messageId: 'ternary' }],
      },
      {
        code: 'foo && foo();',
        output: 'foo?.();',
        errors: [
          {
            messageId: 'logical',
            data: { op: '&&' },
          },
        ],
      },
      {
        code: 'foo || foo();',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: { op: '||' },
          },
        ],
      },
      {
        code: 'foo.bar && foo.bar();',
        output: 'foo.bar?.();',
        errors: [
          {
            messageId: 'logical',
            data: { op: '&&' },
          },
        ],
      },
      {
        code: 'foo.bar && foo.bar.baz();',
        output: 'foo.bar?.baz();',
        errors: [
          {
            messageId: 'logical',
            data: { op: '&&' },
          },
        ],
      },
      {
        code: 'foo ? bar() : baz();',
        output: null,
        errors: [{ messageId: 'ternary' }],
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
