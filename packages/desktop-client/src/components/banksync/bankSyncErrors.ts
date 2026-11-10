/**
 * The sync server answers a failed bank-sync call with a `status: 'ok'`
 * envelope whose payload describes the failure, so the error never throws on
 * the client. These helpers turn that payload into something worth showing the
 * user instead of a hard-coded guess at the cause.
 */

/** Placeholder the server sends when the error carried no message at all. */
const INTERNAL_ERROR_PLACEHOLDER = 'internal-error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Builds the human-readable reason a bank-sync call failed.
 *
 * Prefers the provider's own wording (`summary` / `detail`) over our generic
 * classification, because the provider knows why it said no — an IP block and
 * a rate limit both surface as "credentials might be misconfigured" otherwise.
 * Returns `undefined` when the payload carries nothing worth showing, so the
 * caller can fall back to its generic message.
 */
export function getBankSyncErrorReason(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const classification = readText(payload.error_type);
  const details = isRecord(payload.error_details)
    ? payload.error_details
    : undefined;

  const summary = readText(details?.summary);
  const detail = readText(details?.detail);

  const headline = summary ?? classification;
  if (headline === undefined || headline === INTERNAL_ERROR_PLACEHOLDER) {
    return detail;
  }

  return detail && detail !== headline ? `${headline}: ${detail}` : headline;
}
