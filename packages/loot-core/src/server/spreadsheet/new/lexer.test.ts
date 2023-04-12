import lex from './lexer';

function getTokens(tokens) {
  const toks = [];
  while (!tokens.is_finished()) {
    toks.push(tokens.nextToken());
  }
  return toks;
}

test('lexer basic', () => {
  const tokens = lex(`
    =x !=~ 4
  `);

  expect(getTokens(tokens)).toMatchSnapshot();
});
