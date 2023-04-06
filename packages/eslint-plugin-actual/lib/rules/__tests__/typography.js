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

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    ecmaFeatures: { jsx: true },
  },
});
ruleTester.run('typography', rule, {
  valid: [
    `let test = 'I said “Hello, world!”';`,
    `let test = "I said ‘Hello, world!’";`,
    `let test = \`I said ‘Hello, world!’\`;`,
    `let selected = document.querySelector('[data-test="foo"]');`,
    `let selected = document.querySelectorAll('[data-test="foo"]');`,
    `myNode.innerHTML = '<div data-test="foo">Hello, world!</div>';`,
    `foo.bar.webContents.executeJavaScript('console.log("Hello, world!")');`,
  ],

  invalid: [
    {
      code: 'var test = `I said "Hello, world!"`;',
      errors: [
        { messageId: 'quote', type: 'TemplateElement', column: 20 },
        { messageId: 'quote', type: 'TemplateElement', column: 34 },
      ],
    },
    {
      code: `test2("I said 'Hello, world!'");`,
      errors: [
        { messageId: 'quote', type: 'Literal', column: 15 },
        { messageId: 'quote', type: 'Literal', column: 29 },
      ],
    },
    {
      code: `test3('I said "Hello, world!"');`,
      errors: [
        { messageId: 'quote', type: 'Literal', column: 15 },
        { messageId: 'quote', type: 'Literal', column: 29 },
      ],
    },
    {
      code: `<Test4>I said "Hello, world!"</Test4>`,
      errors: [
        { messageId: 'quote', type: 'JSXText', column: 15 },
        { messageId: 'quote', type: 'JSXText', column: 29 },
      ],
    },
    {
      code: `<Test5>I said 'Hello, world!'</Test5>`,
      errors: [
        { messageId: 'quote', type: 'JSXText', column: 15 },
        { messageId: 'quote', type: 'JSXText', column: 29 },
      ],
    },
  ],
});
