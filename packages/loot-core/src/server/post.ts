// @ts-strict-ignore
import { fetch } from '../platform/server/fetch';
import * as Platform from '../shared/platform';

import { PostError } from './errors';

function throwIfNot200(res: Response, text: string) {
  if (res.status !== 200) {
    if (res.status === 500) {
      throw new PostError(res.status === 500 ? 'internal' : text);
    }

    const contentType = res.headers.get('Content-Type');
    if (contentType.toLowerCase().indexOf('application/json') !== -1) {
      const json = JSON.parse(text);
      throw new PostError(json.reason);
    }

    // Actual Sync Server may be exposed via a tunnel (e.g. ngrok). Tunnel errors should be treated as network errors.
    const tunnelErrorHeaders = ['ngrok-error-code'];
    const tunnelError = tunnelErrorHeaders.some(header =>
      res.headers.has(header),
    );

    if (tunnelError) {
      // Tunnel errors are present when the tunnel is active and the server is not reachable e.g. server is offline
      // When we experience a tunnel error we treat it as a network failure
      throw new PostError('network-failure');
    }

    throw new PostError(text);
  }
}

export async function post(
  url: RequestInfo,
  data: unknown,
  headers = {},
  timeout: number | null = null,
) {
  let text: string;
  let res: Response;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = timeout ? controller.signal : null;
    res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    text = await res.text();
  } catch (err) {
    throw new PostError('network-failure');
  }

  throwIfNot200(res, text);

  let responseData;

  try {
    responseData = JSON.parse(text);
  } catch (err) {
    // Something seriously went wrong. TODO handle errors
    throw new PostError('parse-json', { meta: text });
  }

  if (responseData.status !== 'ok') {
    console.log(
      'API call failed: ' +
        url +
        '\nData: ' +
        JSON.stringify(data, null, 2) +
        '\nResponse: ' +
        JSON.stringify(res, null, 2),
    );

    throw new PostError(
      responseData.description || responseData.reason || 'unknown',
    );
  }

  return responseData.data;
}

export async function del(url, data, headers = {}, timeout = null) {
  let text;
  let res;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = timeout ? controller.signal : null;
    res = await fetch(url, {
      method: 'DELETE',
      body: JSON.stringify(data),
      signal,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    text = await res.text();
  } catch (err) {
    throw new PostError('network-failure');
  }

  throwIfNot200(res, text);

  try {
    res = JSON.parse(text);
  } catch (err) {
    // Something seriously went wrong. TODO handle errors
    throw new PostError('parse-json', { meta: text });
  }

  if (res.status !== 'ok') {
    console.log(
      'API call failed: ' +
        url +
        '\nData: ' +
        JSON.stringify(data, null, 2) +
        '\nResponse: ' +
        JSON.stringify(res, null, 2),
    );

    throw new PostError(res.description || res.reason || 'unknown');
  }

  return res.data;
}

export async function patch(url, data, headers = {}, timeout = null) {
  let text;
  let res;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = timeout ? controller.signal : null;
    res = await fetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      signal,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    text = await res.text();
  } catch (err) {
    throw new PostError('network-failure');
  }

  throwIfNot200(res, text);

  try {
    res = JSON.parse(text);
  } catch (err) {
    // Something seriously went wrong. TODO handle errors
    throw new PostError('parse-json', { meta: text });
  }

  if (res.status !== 'ok') {
    console.log(
      'API call failed: ' +
        url +
        '\nData: ' +
        JSON.stringify(data, null, 2) +
        '\nResponse: ' +
        JSON.stringify(res, null, 2),
    );

    throw new PostError(res.description || res.reason || 'unknown');
  }

  return res.data;
}

export async function postBinary(url, data, headers) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      body: Platform.isBrowser ? data : Buffer.from(data),
      headers: {
        'Content-Length': data.length,
        'Content-Type': 'application/actual-sync',
        ...headers,
      },
    });
  } catch (err) {
    throw new PostError('network-failure');
  }

  let buffer;
  if (res.arrayBuffer) {
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    buffer = await res.buffer();
  }

  throwIfNot200(res, buffer.toString());

  return buffer;
}

export function get(url, opts?) {
  return fetch(url, opts).then(res => res.text());
}
