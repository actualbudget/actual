const escodegen = require('@jlongster/escodegen');

const globals = require('./globals');

// Unfortunately we need to use eval to bypass babel's transform of
// generators. iOS seems to support generators natively, but if it
// doesn't that could be a problem.
// const GeneratorFunction = Object.getPrototypeOf(eval('(function*(){})'))
//   .constructor;

function evaluate(ast) {
  const code = escodegen.generate(ast);

  const args = ['globals', 'return ' + code];

  try {
    // eslint-disable-next-line
    const func = new Function(...args);
    return func(globals);
  } catch (e) {
    console.log('Eval error:', code, e);
    return e.message;
  }
}

module.exports = { evaluate };
