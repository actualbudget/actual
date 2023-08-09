import * as fs from '../platform/server/fs';

type ServerConfig = {
  BASE_SERVER: string;
  SYNC_SERVER: string;
  SIGNUP_SERVER: string;
  PLAID_SERVER: string;
  GOCARDLESS_SERVER: string;
};

let config: ServerConfig | null = null;

function joinURL(base: string | URL, ...paths: string[]): string {
  let url = new URL(base);
  url.pathname = fs.join(...paths);
  return url.toString();
}

export function setServer(url: string): void {
  if (url == null) {
    config = null;
  } else {
    config = getServer(url);
  }
}

// `url` is optional; if not given it will provide the global config
export function getServer(url?: string): ServerConfig | null {
  if (url) {
    return {
      BASE_SERVER: url,
      SYNC_SERVER: joinURL(url, '/sync'),
      SIGNUP_SERVER: joinURL(url, '/account'),
      PLAID_SERVER: joinURL(url, '/plaid'),
      // TODO: change to use `/gocardless` after v23.8.0
      GOCARDLESS_SERVER: joinURL(url, '/nordigen'),
    };
  }
  return config;
}
