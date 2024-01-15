// @ts-strict-ignore
import { quoteAlias } from './compiler';

function selectFields(fields) {
  return Object.keys(fields)
    .map(as => {
      let field = fields[as];
      const needsAs = field !== as;
      // If it's just an identifier, we automatically prefix it with
      // `_.` which makes sure it references the root table
      if (!field.match(/[ .]/)) {
        field = `_.${field}`;
      }
      return needsAs ? `${field} AS ${quoteAlias(as)}` : `${field}`;
    })
    .join(', ');
}

export function makeViews(schema, schemaConfig) {
  const views = schemaConfig.views;
  const viewStrs = [];

  Object.keys(views).forEach(table => {
    const { fields: fieldMappings = {}, ...tableViews } = views[table];

    const publicFields = Object.fromEntries(
      Object.keys(schema[table]).map(name => [name, name]),
    );
    const internalFields = { ...publicFields, ...fieldMappings };

    Object.keys(tableViews).forEach(viewName => {
      const publicMaker = overrides => {
        const fields = { ...publicFields, ...overrides };
        return selectFields(fields);
      };
      const internalMaker = overrides => {
        const fields = { ...internalFields, ...overrides };
        return selectFields(fields);
      };

      let sql;
      if (typeof tableViews[viewName] === 'function') {
        sql = tableViews[viewName](internalMaker, publicMaker);
      } else {
        sql = tableViews[viewName];
      }
      sql = sql.trim().replace(/;$/, '');

      viewStrs.push(`
        DROP VIEW IF EXISTS ${viewName};
        CREATE VIEW ${viewName} AS ${sql};
      `);
    });
  });

  return viewStrs.join('\n');
}
