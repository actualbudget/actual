//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import * as rule from '../no-react-default-import';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

runClassic(
  'no-react-default-import',
  rule,
  {
    valid: [
      // Named imports (correct usage)
      `import { Component, useState } from 'react';`,
      `import { Component as Comp, useState } from 'react';`,

      // Usage of named imports
      `const MyComponent = Component.extend({});`,
      `const [state, setState] = useState(0);`,

      // Other identifiers
      `const ReactLib = require('react-lib');`,
      `ReactLib.something();`,

      // Non-React member expressions
      `const obj = { React: 'test' };`,
      `obj.React.something();`,

      // JSX with Fragment (correct usage)
      `import { Fragment } from 'react';`,
      `const element = <Fragment>Test</Fragment>;`,
    ],

    invalid: [
      {
        code: 'const Component = React.Component;',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
            type: 'MemberExpression',
          },
        ],
      },
      {
        code: 'const [state, setState] = React.useState(0);',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
            type: 'MemberExpression',
          },
        ],
      },
      {
        code: 'class MyComponent extends React.Component {}',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
            type: 'MemberExpression',
          },
        ],
      },
      {
        code: 'function test() { return React.createElement("div"); }',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
            type: 'MemberExpression',
          },
        ],
      },
      {
        code: 'const element = <React.Fragment>Test</React.Fragment>;',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
            type: 'JSXMemberExpression',
          },
          {
            messageId: 'useNamedExport',
            type: 'JSXMemberExpression',
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
