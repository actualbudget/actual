//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['no-anchor-tag'];

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

void runClassic(
  'no-anchor-tag',
  rule,
  {
    valid: [
      // Link component usage
      `<Link variant="external" to="https://example.com">Click me</Link>`,
      `<Link variant="internal" to="/path">Internal link</Link>`,

      // Other JSX elements
      `<div>Content</div>`,
      `<span>Text</span>`,
      `<button>Click</button>`,

      // JSX with different casing
      `<A>Not an anchor</A>`,
      `<Anchor>Not an anchor</Anchor>`,

      // Self-closing tags
      `<img src="test.jpg" />`,
      `<br />`,
    ],

    invalid: [
      {
        code: '<a href="https://example.com">Link</a>',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
      {
        code: '<a href="/path" target="_blank">External</a>',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
      {
        code: '<a>Click here</a>',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
      {
        code: '<div><a href="/test">Link</a></div>',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
      {
        code: 'function Component() { return <a href="/">Home</a>; }',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2020,
      ecmaFeatures: { jsx: true },
      sourceType: 'module',
    },
  },
);
