import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { theme } from './theme';

function readTokens(file: string) {
  const css = readFileSync(join(__dirname, 'themes', file), 'utf8');
  return [...css.matchAll(/--color-([A-Za-z0-9]+)\s*:/g)]
    .map(match => match[1])
    .sort();
}

describe('theme tokens', () => {
  const themeKeys = Object.keys(theme).sort();

  it.each(['light.css', 'dark.css', 'midnight.css'])(
    '%s defines exactly the tokens in theme.ts',
    file => {
      expect(readTokens(file)).toEqual(themeKeys);
    },
  );

  it('maps every key to its own css variable', () => {
    for (const [key, value] of Object.entries(theme)) {
      expect(value).toMatch(new RegExp(`^var\\(--color-${key}[,)]`));
    }
  });
});
