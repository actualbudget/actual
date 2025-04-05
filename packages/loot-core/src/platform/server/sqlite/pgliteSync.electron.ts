export function pgliteSync(
  table: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  primaryKeyColumn: string,
  primaryKeyValue: string,
) {
  // Default to id.
  primaryKeyColumn = primaryKeyColumn || 'id';

  console.log(
    'pgliteSync',
    table,
    operation,
    primaryKeyColumn,
    primaryKeyValue,
  );

  return 0;
}
