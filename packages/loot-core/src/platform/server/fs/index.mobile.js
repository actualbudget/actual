let path = require('path');
let fs = require('./index.electron.js');

// On mobile, the backend runs from a single bundle mounted at the
// root where there is a `data` folder that contains these files
export default {
  ...fs,
  bundledDatabasePath: path.join(__dirname, 'data/default-db.sqlite'),
  migrationsPath: path.join(__dirname, 'data/migrations'),
  demoBudgetPath: path.join(__dirname, 'data/demo-budget')
};
