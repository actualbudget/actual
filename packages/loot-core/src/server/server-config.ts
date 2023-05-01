import * as fs from '../platform/server/fs';

let config = null;

function joinURL(base, ...paths) {
  let url = new URL(base);
  url.pathname = fs.join(...paths);
  return url.toString();
}

export function setServer(url) {
  if (url == null) {
    config = null;
  } else {
    config = getServer(url);
  }
}

// `url` is optional; if not given it will provide the global config
export function getServer(url?) {
  if (url) {
    return {
      BASE_SERVER: url,
      SYNC_SERVER: joinURL(url, '/sync'),
      SIGNUP_SERVER: joinURL(url, '/account'),
      PLAID_SERVER: joinURL(url, '/plaid'),
      NORDIGEN_SERVER: joinURL(url, '/nordigen'),
    };
  }
  return config;
}
