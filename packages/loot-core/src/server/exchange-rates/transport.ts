import { fetchQuiet } from '#platform/server/fetch';
import { logger } from '#platform/server/log';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

const codes = [
  'unauthorized',
  'token-expired',
  'not-admin',
  'provider-not-found',
  'invalid-config-key',
  'invalid-config-value',
  'invalid-provider-id',
  'invalid-request',
  'network',
  'timeout',
  'deadline',
  'cancelled',
  'server-error',
] as const;
export type FxTransportCode = (typeof codes)[number];
export type FxRequestResult =
  | { ok: true; data: JsonObject }
  | { ok: false; code: FxTransportCode };
type RequestOptions = {
  server: string;
  token: string;
  lifecycle: AbortSignal;
  deadline?: AbortSignal;
};

export async function fxRequest(
  path: 'providers' | 'lookup',
  body: JsonObject,
  options: RequestOptions,
): Promise<FxRequestResult> {
  const controller = new AbortController();
  let timedOut = false;
  const errorCode = (): FxTransportCode =>
    options.lifecycle.aborted
      ? 'cancelled'
      : options.deadline?.aborted
        ? 'deadline'
        : timedOut
          ? 'timeout'
          : 'network';
  if (options.lifecycle.aborted || options.deadline?.aborted) {
    return { ok: false, code: errorCode() };
  }

  let stop: (value: FxRequestResult) => void = () => undefined;
  const stopped = new Promise<FxRequestResult>(resolve => {
    stop = resolve;
  });
  const abort = () => {
    stop({ ok: false, code: errorCode() });
    controller.abort();
  };
  options.lifecycle.addEventListener('abort', abort, { once: true });
  options.deadline?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    abort();
  }, 20000);

  const work = async (): Promise<FxRequestResult> => {
    try {
      const response = await fetchQuiet(
        `${options.server.replace(/\/$/, '')}/${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ACTUAL-TOKEN': options.token,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
      const text = await response.text();
      let parsed: JsonValue;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, code: 'server-error' };
      }
      if (isObject(parsed)) {
        if (
          response.status === 200 &&
          parsed.status === 'ok' &&
          isObject(parsed.data)
        ) {
          return { ok: true, data: parsed.data };
        }
        const known = codes.find(code => code === parsed.reason);
        if (known) return { ok: false, code: known };
      }
      return {
        ok: false,
        code: response.status === 401 ? 'unauthorized' : 'server-error',
      };
    } catch {
      // The exception and response text never enter errors, events or logs.
      return { ok: false, code: errorCode() };
    }
  };
  try {
    let result = await Promise.race([work(), stopped]);
    if (options.lifecycle.aborted || options.deadline?.aborted) {
      result = { ok: false, code: errorCode() };
    }
    logger.log('fx transport', path, result.ok === false ? result.code : 'ok');
    return result;
  } finally {
    clearTimeout(timer);
    options.lifecycle.removeEventListener('abort', abort);
    options.deadline?.removeEventListener('abort', abort);
  }
}
export function isObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
