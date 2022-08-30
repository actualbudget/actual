module.exports = {
  input: ['src/**/*.js'],
  output: 'src/locales/$LOCALE.json',
  locales: ['en-GB', 'es-ES'],
  sort: true,
  indentation: 4,
  // Force usage of JsxLexer for .js files as otherwise we can't pick up <Trans> components.
  lexers: {
    js: ['JsxLexer'],
    ts: ['JsxLexer'],
    jsx: ['JsxLexer'],
    tsx: ['JsxLexer'],

    default: ['JsxLexer']
  }
};
