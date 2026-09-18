// Keeps catch blocks useful without assuming thrown values are Error objects.
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
