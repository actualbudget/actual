//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import * as rule from '../prefer-if-statement';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

runClassic(
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
            type: 'ExpressionStatement',
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
            type: 'ExpressionStatement',
          },
        ],
      },
      {
        code: 'foo ? bar : baz;',
        output: null,
        errors: [{ messageId: 'ternary', type: 'ExpressionStatement' }],
      },
      {
        code: 'function foo() { bar && baz; }',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: { op: '&&' },
            type: 'ExpressionStatement',
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
            type: 'ExpressionStatement',
          },
        ],
      },
      {
        code: 'function foo() { bar ? baz : qux; }',
        output: null,
        errors: [{ messageId: 'ternary', type: 'ExpressionStatement' }],
      },
      {
        code: 'foo && foo();',
        output: 'foo?.();',
        errors: [
          {
            messageId: 'logical',
            data: { op: '&&' },
            type: 'ExpressionStatement',
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
            type: 'ExpressionStatement',
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
            type: 'ExpressionStatement',
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
            type: 'ExpressionStatement',
          },
        ],
      },
      {
        code: 'foo ? bar() : baz();',
        output: null,
        errors: [{ messageId: 'ternary', type: 'ExpressionStatement' }],
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
