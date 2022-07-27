import VM from './vm';

const { unresolveName } = require('../util');

const db = {
  runQuery: sql => {
    return Promise.resolve([{ 'sum(t.amount)': 1000 }]);
  }
};

function makeScopes(vars) {
  return {
    getVariable: resolvedName => {
      const { name } = unresolveName(resolvedName);

      if (vars[resolvedName] !== undefined) {
        return vars[resolvedName];
      } else if (vars[name] !== undefined) {
        return vars[name];
      }

      throw new Error(`"${resolvedName} is not defined`);
    },

    setVariable: (name, value) => {
      vars[name] = value;
    },

    getAll: () => vars
  };
}

function run(src, vars = {}) {
  const scopes = makeScopes(vars);
  const vm = new VM(db, scopes);

  return new Promise(resolve => {
    vm.runSource(src, () => {
      expect(scopes.getAll()).toMatchSnapshot();
      resolve();
    });
  });
}

test('vm basic', async () => {
  return run(`=-(1 + 2 + 3)`, {
    number: x => {
      return x;
    },
    firstValue: arr => {
      return arr[0]['sum(t.amount)'];
    }
  });
});

test('vm boolean types', async () => {
  return run('=if(true and (1 + 2 + 3 - 5)) { 0 } else { 1 } ');
});
