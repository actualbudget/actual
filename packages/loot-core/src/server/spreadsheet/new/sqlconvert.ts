import { SCHEMA_PATHS } from './sqlgen';

export default function convert(table, item) {
  if (SCHEMA_PATHS[table]) {
    let fields = SCHEMA_PATHS[table];
    let updates = {};
    Object.keys(item).forEach(k => {
      let mappedField = fields[k] && fields[k].field;

      if (mappedField) {
        updates[k] = item[mappedField];
      }
    });

    return { ...item, ...updates };
  }
  return item;
}
