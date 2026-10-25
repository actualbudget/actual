/**
 * A rate source as shown to people: a fetched rate's provider without the
 * stored `plugin:` namespace, so `plugin:exchange-api` reads `exchange-api`.
 */
export function rateSourceName(source: string): string {
  return source.startsWith('plugin:') ? source.slice('plugin:'.length) : source;
}
