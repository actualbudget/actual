export function pgliteSync(
  table: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  primaryKeyColumn: string,
  primaryKeyValue: string,
): 1 | 0;
