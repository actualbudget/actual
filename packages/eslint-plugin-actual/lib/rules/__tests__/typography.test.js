//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import * as rule from '../typography';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

runClassic(
  'typography',
  rule,
  {
    valid: [
      `let test = 'I said "Hello, world!"';`,
      `let test = "I said 'Hello, world!'";`,
      `let test = \`I said 'Hello, world!'\`;`,
      `let selected = document.querySelector('[data-test="foo"]');`,
      `let selected = document.querySelectorAll('[data-test="foo"]');`,
      `myNode.innerHTML = '<div data-test="foo">Hello, world!</div>';`,
      `foo.bar.webContents.executeJavaScript('console.log("Hello, world!")');`,
    ],

    invalid: [
      {
        code: 'var test = `I said \u201CHello, world!\u201D`;',
        errors: [
          { messageId: 'quote', type: 'TemplateElement', column: 20 },
          { messageId: 'quote', type: 'TemplateElement', column: 34 },
        ],
      },
      {
        code: `test2("I said \u2018Hello, world!\u2019");`,
        errors: [
          { messageId: 'quote', type: 'Literal', column: 15 },
          { messageId: 'quote', type: 'Literal', column: 29 },
        ],
      },
      {
        code: `test3('I said \u201CHello, world!\u201D');`,
        errors: [
          { messageId: 'quote', type: 'Literal', column: 15 },
          { messageId: 'quote', type: 'Literal', column: 29 },
        ],
      },
      {
        code: `<Test4>I said \u201CHello, world!\u201D</Test4>`,
        errors: [
          { messageId: 'quote', type: 'JSXText', column: 15 },
          { messageId: 'quote', type: 'JSXText', column: 29 },
        ],
      },
      {
        code: `<Test5>I said \u2018Hello, world!\u2019</Test5>`,
        errors: [
          { messageId: 'quote', type: 'JSXText', column: 15 },
          { messageId: 'quote', type: 'JSXText', column: 29 },
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
