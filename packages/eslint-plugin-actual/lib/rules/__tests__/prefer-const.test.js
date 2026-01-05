//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import * as rule from '../prefer-const';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

runClassic(
  'prefer-const',
  rule,
  {
    valid: [
      // Already using const
      `const x = 1;`,
      `const x = 1, y = 2;`,

      // let that gets reassigned
      `let x = 1; x = 2;`,
      `let x = 1; x++;`,
      `let x = 1; x += 1;`,
      `let x = 1; x--;`,
      `let x = 1; x -= 1;`,

      // let in for loops
      `for (let i = 0; i < 10; i++) {}`,
      `for (let item of items) {}`,
      `for (let item in items) {}`,

      // Destructuring with reassignment
      `let { x } = obj; x = 2;`,
      `let [x] = arr; x = 2;`,

      // Variables used before declaration (temporal dead zone)
      `let x; x = 1;`,

      // Destructuring assignment (valid use of let)
      `let id; ({ id } = obj);`,
      `let x, y; ({ x, y } = obj);`,
      `async function test() { let id; ({ id } = await someFunction()); }`,
      `let x, y; [x, y] = arr;`,
      `async function test() { let id; try { ({ id } = await func()); } catch {} }`,

      // Function parameters (not applicable)
      `function test(x) { return x; }`,

      // Variables in different scopes
      `const x = 1; function test() { let x = 2; x = 3; }`,
    ],

    invalid: [
      {
        code: 'let x = 1;',
        output: 'const x = 1;',
        errors: [
          {
            messageId: 'useConst',
            data: { name: 'x' },
            type: 'Identifier',
          },
        ],
      },
      {
        code: 'let x = 1, y = 2;',
        output: 'const x = 1, y = 2;',
        errors: [
          {
            messageId: 'useConst',
            data: { name: 'x' },
            type: 'Identifier',
          },
          {
            messageId: 'useConst',
            data: { name: 'y' },
            type: 'Identifier',
          },
        ],
      },
      {
        code: 'let x = 1; console.log(x);',
        output: 'const x = 1; console.log(x);',
        errors: [
          {
            messageId: 'useConst',
            data: { name: 'x' },
            type: 'Identifier',
          },
        ],
      },
      {
        code: 'let x = 1; let y = 2;',
        output: 'const x = 1; const y = 2;',
        errors: [
          {
            messageId: 'useConst',
            data: { name: 'x' },
            type: 'Identifier',
          },
          {
            messageId: 'useConst',
            data: { name: 'y' },
            type: 'Identifier',
          },
        ],
      },
      {
        code: 'function test() { let x = 1; return x; }',
        output: 'function test() { const x = 1; return x; }',
        errors: [
          {
            messageId: 'useConst',
            data: { name: 'x' },
            type: 'Identifier',
          },
        ],
      },
      {
        code: 'let { x } = obj;',
        output: 'const { x } = obj;',
        errors: [
          {
            messageId: 'useConst',
            data: { name: 'x' },
            type: 'Identifier',
          },
        ],
      },
      {
        code: 'let [x] = arr;',
        output: 'const [x] = arr;',
        errors: [
          {
            messageId: 'useConst',
            data: { name: 'x' },
            type: 'Identifier',
          },
        ],
      },
      {
        code: 'let x = 1, y = 2; y = 3;',
        output: 'let x = 1, y = 2; y = 3;',
        errors: [
          {
            messageId: 'useConst',
            data: { name: 'x' },
            type: 'Identifier',
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
