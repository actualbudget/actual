/* eslint-disable @actual-app/typography */
'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

let RuleTester = require('eslint').RuleTester;

let rule = require('../../../lib/rules/let');

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

let ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    ecmaFeatures: { jsx: true },
  },
});
ruleTester.run('let', rule, {
  valid: [`let test = "Hello, world!";`],

  invalid: [
    {
      code: 'var test = "Hello, world!";',
      errors: [
        {
          messageId: 'error',
          data: { kind: 'var' },
          type: 'VariableDeclaration',
          column: 1,
        },
      ],
      output: 'let test = "Hello, world!";',
    },
    {
      code: 'const test = "Hello, world!";',
      errors: [
        {
          messageId: 'error',
          data: { kind: 'const' },
          type: 'VariableDeclaration',
          column: 1,
        },
      ],
      output: 'let test = "Hello, world!";',
    },
  ],
});
