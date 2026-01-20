// @ts-strict-ignore
import { dayFromDate } from '../../shared/months';
import { fromDateRepr, toDateRepr } from '../models';

function isRequired(name, fieldDesc) {
  return fieldDesc.required || name === 'id';
}

// TODO: All of the data type needs to check the input value. This
// doesn't just convert, it casts. See integer handling.
export function convertInputType(value, type) {
  if (value === undefined) {
    throw new Error('Query value cannot be undefined');
  } else if (value === null) {
    if (type === 'boolean') {
      return 0;
    }

    return null;
  }

  switch (type) {
    case 'date':
      if (value instanceof Date) {
        return toDateRepr(dayFromDate(value));
      } else if (
        value.match(/^\d{4}-\d{2}-\d{2}$/) == null ||
        value < '1995-01-01'
      ) {
        throw new Error('Invalid date: ' + value);
      }

      return toDateRepr(value);
    case 'date-month':
      return toDateRepr(value.slice(0, 7));
    case 'date-year':
      return toDateRepr(value.slice(0, 4));
    case 'boolean':
      return value ? 1 : 0;
    case 'id':
      if (typeof value !== 'string' && value !== null) {
        throw new Error('Invalid id, must be string: ' + value);
      }
      return value;
    case 'integer':
      if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
      } else {
        throw new Error("Can't convert to integer: " + JSON.stringify(value));
      }
    case 'json':
      return JSON.stringify(value);
    default:
  }
  return value;
}

export function convertOutputType(value, type) {
  if (value === null) {
    if (type === 'boolean') {
      return false;
    }
    return null;
  }

  switch (type) {
    case 'date':
      return fromDateRepr(value);
    case 'date-month':
      return fromDateRepr(value).slice(0, 7);
    case 'date-year':
      return fromDateRepr(value).slice(0, 4);
    case 'boolean':
      return value === 1;
    case 'json':
    case 'json/fallback':
      try {
        return JSON.parse(value);
      } catch {
        return type === 'json/fallback' ? value : null;
      }
    default:
  }

  return value;
}

export function conform(
  schema,
  schemaConfig,
  table,
  obj,
  { skipNull = false } = {},
) {
  const tableSchema = schema[table];
  if (tableSchema == null) {
    throw new Error(`Table "${table}" does not exist`);
  }

  const views = schemaConfig.views || {};

  // Rename fields if necessary
  const fieldRef = field => {
    if (views[table] && views[table].fields) {
      return views[table].fields[field] || field;
    }
    return field;
  };

  return Object.fromEntries(
    Object.keys(obj)
      .map(field => {
        // Fields that start with an underscore are ignored
        if (field[0] === '_') {
          return null;
        }

        const fieldDesc = tableSchema[field];
        if (fieldDesc == null) {
          throw new Error(
            `Field "${field}" does not exist on table ${table}: ${JSON.stringify(
              obj,
            )}`,
          );
        }

        if (isRequired(field, fieldDesc) && obj[field] == null) {
          throw new Error(
            `"${field}" is required for table "${table}": ${JSON.stringify(
              obj,
            )}`,
          );
        }

        // This option removes null values (see `convertForInsert`)
        if (skipNull && obj[field] == null) {
          return null;
        }

        return [fieldRef(field), convertInputType(obj[field], fieldDesc.type)];
      })
      .filter(Boolean),
  );
}

export function convertForInsert(schema, schemaConfig, table, rawObj) {
  const obj = { ...rawObj };

  const tableSchema = schema[table];
  if (tableSchema == null) {
    throw new Error(`Error inserting: table "${table}" does not exist`);
  }

  // Inserting checks all the fields in the table and adds any default
  // values necessary
  Object.keys(tableSchema).forEach(field => {
    const fieldDesc = tableSchema[field];

    if (obj[field] == null) {
      if (fieldDesc.default !== undefined) {
        obj[field] =
          typeof fieldDesc.default === 'function'
            ? fieldDesc.default()
            : fieldDesc.default;
      } else if (isRequired(field, fieldDesc)) {
        // Although this check is also done in `conform`, it only
        // checks the fields in `obj`. For insert, we need to do it
        // here to check that all required fields in the table exist
        throw new Error(
          `"${field}" is required for table "${table}": ${JSON.stringify(obj)}`,
        );
      }
    }
  });

  // We use `skipNull` to remove any null values. There's no need to
  // set those when inserting, that will be the default and it reduces
  // the amount of messages generated to sync
  return conform(schema, schemaConfig, table, obj, { skipNull: true });
}

export function convertForUpdate(schema, schemaConfig, table, rawObj) {
  const obj = { ...rawObj };

  const tableSchema = schema[table];
  if (tableSchema == null) {
    throw new Error(`Error updating: table "${table}" does not exist`);
  }

  return conform(schema, schemaConfig, table, obj);
}

export function convertFromSelect(schema, schemaConfig, table, obj) {
  const tableSchema = schema[table];
  if (tableSchema == null) {
    throw new Error(`Table "${table}" does not exist`);
  }

  const fields = Object.keys(tableSchema);
  const result = {};
  for (let i = 0; i < fields.length; i++) {
    const fieldName = fields[i];
    const fieldDesc = tableSchema[fieldName];

    result[fieldName] = convertOutputType(obj[fieldName], fieldDesc.type);
  }
  return result;
}
