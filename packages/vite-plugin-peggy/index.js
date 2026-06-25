import peggy from 'peggy';

// Matches the grammar files imported across the codebase (`.pegjs`/`.peggy`).
const GRAMMAR_RE = /\.peg(js|gy)$/;

/**
 * In-repo replacement for the third-party `vite-plugin-peggy-loader`. Compiles
 * imported Peggy grammars into an ES module that exports the generated parser
 * (notably its `parse` function), using the `peggy` dependency directly.
 *
 * @returns {import('vite').Plugin}
 */
export function peggyLoader() {
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
