export function isError(value: unknown): value is { error: unknown } {
  return (value as { error: unknown }).error !== undefined;
}
