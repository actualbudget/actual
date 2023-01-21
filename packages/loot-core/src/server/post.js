import Platform from './platform';

const { fetch } = require('../platform/server/fetch');

const { PostError } = require('./errors');

function throwIfNot200(res, text) {
  if (res.status !== 200) {
    if (res.status === 500) {
      throw new PostError(res.status === 500 ? 'internal' : text);
    }

    let contentType = res.headers.get('Content-Type');
    if (contentType.toLowerCase().indexOf('application/json') !== -1) {
      let json = JSON.parse(text);
      throw new PostError(json.reason);
    }
    throw new PostError(text);
  }
}

export async function post(url, data) {
  let text;
  let res;

  try {
    res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    });
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
        JSON.stringify(res, null, 2)
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
      body: Platform.isWeb ? data : Buffer.from(data),
      headers: {
        'Content-Length': data.length,
        'Content-Type': 'application/actual-sync',
        ...headers
      }
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

export function get(url, opts) {
  return fetch(url, opts).then(res => res.text());
}
