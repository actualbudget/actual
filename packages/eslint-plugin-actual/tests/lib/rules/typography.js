/* eslint-disable rulesdir/typography */
'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const RuleTester = require('eslint').RuleTester;

const rule = require('../../../lib/rules/typography');

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester();
ruleTester.run('typography', rule, {
  valid: [
    `let test = 'I said “Hello, world!”';`,
    `let test = "I said ‘Hello, world!’";`,
    `let selected = document.querySelector('[data-test="foo"]');`,
    `let selected = document.querySelectorALl('[data-test="foo"]');`,
  ],

  invalid: [
    {
      code: 'let test = `I said "Hello, world!"`;',
      errors: [{ messageId: 'quote', type: 'TemplateElement' }],
    },
    {
      code: `test2("I said 'Hello, world!'");`,
      errors: [{ messageId: 'quote', type: 'Literal' }],
    },
    {
      code: `test3('I said "Hello, world!"');`,
      errors: [{ messageId: 'quote', type: 'Literal' }],
    },
    {
      code: `<Test4>I said "Hello, world!"</Test4>`,
      errors: [{ messageId: 'quote', type: 'JSXText' }],
    },
    {
      code: `<Test5>I said 'Hello, world!'</Test5>`,
      errors: [{ messageId: 'quote', type: 'JSXText' }],
    },
  ],
});
