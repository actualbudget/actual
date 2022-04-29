import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import ignore from 'rollup-plugin-ignore';
import commonjs from 'rollup-plugin-commonjs';

export default {
  output: {
    file: '/tmp/actual-payees.demo.js',
    format: 'esm'
    // name: 'ManagePayees'
  },
  external: id => /^(react|react-dom)$/.test(id),
  plugins: [
    ignore(['./DateSelect']),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    resolve({
      extensions: ['.web.js', '.js']
    }),
    babel({
      exclude: 'node_modules/**'
    }),
    commonjs({
      namedExports: { '../../node_modules/glamor/lib/index.js': [] }
    })
  ]
};
