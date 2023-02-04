const escodegen = require('escodegen');
const sqlite = require('sqlite3');

const Spreadsheet = require('./spreadsheet');
const sqlgen = require('./sqlgen');

// Example usage:

const db = new sqlite.Database(__dirname + '/../../db.sqlite');
const sheet = new Spreadsheet({
  plugins: {
    runQuery: {
      parse: ast => {
        const queryAST = ast.arguments[0];
        const code = 'return ' + escodegen.generate(queryAST);
        // eslint-disable-next-line
        const func = new Function(code);
        const query = func();
        const sql = sqlgen(query);

        return {
          data: {
            type: 'query',
            query: query,
            sql: sql
          },

          ast: {
            type: 'CallExpression',
            callee: {
              type: 'Identifier',
              name: 'runQuery'
            },
            arguments: [
              {
                type: 'Literal',
                raw: sql,
                value: sql
              }
            ]
          }
        };
      },
      run: sql => {
        return new Promise(resolve => {
          db.all(sql, function (err, rows) {
            if (err) {
              throw new Error(err);
            }
            resolve(rows);
          });
        });
      }
    }
  }
});

db.on('preupdate', function (type, dbname, table, old, _new, oldId, newId) {
  sheet.resolve().then(() => {
    const start = Date.now();
    sheet.startTransaction();
    sheet
      .getNodesOfType('query')
      .filter(node => node.data.query.table === table)
      .forEach(q => {
        sheet.signal(q.name);
      });
    sheet.endTransaction();

    console.log('[preupdate]', Date.now() - start);
  });
});

function insertRow() {
  const start = Date.now();
  console.log('[insertRow] started');
  db.run(
    'INSERT INTO transactions (acct, category, amount, description, date)' +
      '  VALUES (3, 2, 944, "shirt", 1456808400000);',
    function () {
      console.log('[insertRow] fired', Date.now() - start);
      const t = Math.random() * 100;
      console.log('[insertRow] waiting', t);
      setTimeout(insertRow, t);
    }
  );
}

insertRow();
