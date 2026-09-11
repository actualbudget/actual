import { GoCardlessApiError } from '#app-gocardless/services/gocardless-api';

/**
 * The part of a GoCardless failure that is safe to hand back to the client.
 * Deliberately a whitelist: GoCardless error bodies are echoed back to the
 * browser, so only the human-readable fields and the HTTP status travel, never
 * the raw body or the request headers (which carry our bearer token).
 */
export type GoCardlessErrorDetails = {
  status?: number;
  summary?: string;
  detail?: string;
};

const MAX_TEXT_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : undefined;
}

function readSummaryAndDetail(value: unknown): GoCardlessErrorDetails {
  if (!isRecord(value)) {
    return {};
  }

  const summary = readText(value.summary);
  const detail = readText(value.detail);

  return {
    ...(summary ? { summary } : {}),
    ...(detail ? { detail } : {}),
  };
}

/**
 * GoCardless answers either with a flat `{ summary, detail }` body or, for
 * validation failures, with one such object per rejected field
 * (`{ country: { summary, detail } }`). Only the first rejected field is
 * reported — it is enough to tell the user what to correct.
 */
function readErrorBody(body: unknown): GoCardlessErrorDetails {
  const flat = readSummaryAndDetail(body);
  if (flat.summary || flat.detail) {
    return flat;
  }

  if (!isRecord(body)) {
    return {};
  }

  for (const value of Object.values(body)) {
    const nested = readSummaryAndDetail(value);
    if (nested.summary || nested.detail) {
      return nested;
    }
  }

  return {};
}

function findApiError(error: unknown): GoCardlessApiError | undefined {
  if (error instanceof GoCardlessApiError) {
    return error;
  }

  if (error instanceof Error && 'details' in error) {
    const { details } = error as { details: unknown };
    if (details instanceof GoCardlessApiError) {
      return details;
    }
  }

  return undefined;
}

/**
 * Pulls the reason GoCardless rejected a request out of whatever error the
 * service layer threw, so it can be surfaced in the UI instead of being
 * collapsed into a generic message. Returns `undefined` for failures that did
 * not come from the GoCardless API.
 */
export function getGoCardlessErrorDetails(
  error: unknown,
): GoCardlessErrorDetails | undefined {
  const apiError = findApiError(error);

  let status: number | undefined;
  let body: unknown;

  if (apiError) {
    status = apiError.response.status;
    body = apiError.response.data;
  } else if (error instanceof Error && 'details' in error) {
    // `GenericGoCardlessError` carries the raw response body rather than a
    // `GoCardlessApiError`, so there is no status to report.
    body = (error as { details: unknown }).details;
  } else {
    return undefined;
  }

  const details = {
    ...(status !== undefined ? { status } : {}),
    ...readErrorBody(body),
  };

  return Object.keys(details).length > 0 ? details : undefined;
}
