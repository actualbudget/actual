// No OS-level memory API is available in a browser context.
export function getAvailableMemory(): number | null {
  return null;
}
