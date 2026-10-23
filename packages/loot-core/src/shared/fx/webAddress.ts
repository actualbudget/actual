// Whether `value` is an http or https address, e.g. of a self-hosted
// exchange rate server
export function isWebAddress(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
