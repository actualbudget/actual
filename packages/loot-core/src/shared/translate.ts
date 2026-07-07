/**
 * Identity stub for i18next-parser extraction.
 *
 * The i18n parser (i18next-parser) scans for `t(...)` calls to discover
 * translatable strings.  Since loot-core is a backend package without
 * a React / i18next dependency, this identity stub provides the call-site
 * pattern the parser needs while keeping the runtime a no-op.
 *
 * The actual translation happens at the UI layer (desktop-client), where
 * the notification messages returned by loot-core are passed through the
 * real `t()` from react-i18next / i18next.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function t(msg: string, ..._args: any[]): string {
  return msg;
}

export function plural(
  count: number,
  singular: string,
  _plural: string,
): string {
  return count === 1 ? singular : _plural;
}
