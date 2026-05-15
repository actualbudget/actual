export type UpdateVersionErrorCode =
  | 'out-of-sync-migrations'
  | 'out-of-sync-data'
  | 'loading-budget';

// Maps an `updateVersion` failure to the user-facing error and a flag for
// whether the error is an unexpected bug worth reporting. `out-of-sync-*`
// errors are expected recovery states (the user is guided to resync from the
// server); `schema-out-of-sync` and any unrecognized message indicate a real
// bug.
export function classifyUpdateVersionError(message: string): {
  error: UpdateVersionErrorCode;
  report: boolean;
} {
  if (message.includes('out-of-sync-migrations')) {
    return { error: 'out-of-sync-migrations', report: false };
  }
  if (message.includes('out-of-sync-data')) {
    return { error: 'out-of-sync-data', report: false };
  }
  if (message.includes('schema-out-of-sync')) {
    return { error: 'out-of-sync-migrations', report: true };
  }
  return { error: 'loading-budget', report: true };
}
