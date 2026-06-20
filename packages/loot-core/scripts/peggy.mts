import peggy from 'peggy';
import type { Plugin } from 'vite';

// Matches the grammar files imported across the codebase (`.pegjs`/`.peggy`).
const GRAMMAR_RE = /\.peg(js|gy)$/;

// In-repo replacement for the third-party `vite-plugin-peggy-loader`. Compiles
// imported Peggy grammars into an ES module that exports the generated parser
// (notably its `parse` function), using the `peggy` dependency directly.
export function peggyLoader(): Plugin {
  return {
    name: 'peggy-loader',
    transform(grammar, id) {
      if (!GRAMMAR_RE.test(id)) {
        return null;
      }

      const code = peggy.generate(grammar, {
        output: 'source',
        format: 'es',
        grammarSource: id,
      });

      return { code, map: null };
    },
  };
}
