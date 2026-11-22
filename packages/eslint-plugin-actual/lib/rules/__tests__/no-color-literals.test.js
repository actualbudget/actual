import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['no-color-literals'];

void runClassic(
  'no-color-literals',
  rule,
  {
    valid: [
      `const style = { color: theme.pageText };`,
      `const style = { backgroundColor: 'transparent', color: 'inherit' };`,
      `const style = { fill: 'currentColor', border: 'none' };`,
      `const style = { border: \`1px solid \${theme.tableBorder}\` };`,
      `const style = { boxShadow: styles.shadow.boxShadow };`,
      `const style = { color: isActive ? theme.pageText : undefined };`,
      `const tag = { name: 'red', id: '#fff' };`,
      `const style = { width: 100, content: '#' };`,
      `<Icon color={theme.pageText} />`,
      `<View title="#fff" />`,
      `<rect fill="url(#fade)" />`,
      `<Link variant="external" linkColor="purple" />`,
      `const style = { background: 'url(/img/black.png) no-repeat' };`,
      `const style = { backgroundImage: 'url(/img/black.png)' };`,
      `const style = { border: '1px solid ' + theme.tableBorder };`,
      `const style = { background: 'url(' + '/img/black.png' + ')' };`,
      `const style = { background: 'url(/img/black' + extension + ')' };`,
      `const style = { color: \`rgb(from \${theme.pageText} r g b / 0.5)\` };`,
    ],

    invalid: [
      {
        code: `const style = { color: 'aliceblue' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken', data: { value: 'aliceblue' } }],
      },
      {
        code: `const style = { border: '1px solid rebeccapurple' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { color: 'rgb(from #fff r g b / 0.5)' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { color: \`rgb(from \${theme.pageText} r g b / 0.5) red\` };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { backgroundImage: 'linear-gradient(#fff, #000)' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { border: '1px solid ' + '#fff' };`,
        output: null,
        errors: [
          { messageId: 'useThemeToken', data: { value: '1px solid #fff' } },
        ],
      },
      {
        code: `const style = { border: '1px solid ' + (isActive ? 'red' : theme.tableBorder) };`,
        output: null,
        errors: [{ messageId: 'useThemeToken', data: { value: 'red' } }],
      },
      {
        code: `const style = { color: 'rgb(from color(srgb 1 0 0) r g b / 0.5)' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { color: 'color(display-p3 1 0 0)' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { color: '#fff' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken', data: { value: '#fff' } }],
      },
      {
        code: `const style = { backgroundColor: '#1a2B3c' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { boxShadow: '0 1px 6px rgba(0, 0, 0, .20)' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { border: '1px solid red' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { border: \`1px solid \${isActive ? '#000' : theme.tableBorder}\` };`,
        output: null,
        errors: [{ messageId: 'useThemeToken', data: { value: '#000' } }],
      },
      {
        code: `const style = { color: isActive ? 'white' : 'black' };`,
        output: null,
        errors: [
          { messageId: 'useThemeToken', data: { value: 'white' } },
          { messageId: 'useThemeToken', data: { value: 'black' } },
        ],
      },
      {
        code: `const style = { 'background-color': 'hsl(0 0% 50%)' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { '&:hover': { color: '#fff' } };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const styles = { cardShadow: '0 1px 3px rgba(0,0,0,0.12)' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { background: 'url(#fade) #fff' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `<ReferenceLine y={0} stroke="#000" />`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `<Bar fill={isActive ? '#8884d8' : theme.reportsBlue} />`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
);
