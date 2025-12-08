import * as fs from '../platform/server/fs';
import { logger } from '../platform/server/log';

type ServerConfig = {
  BASE_SERVER: string;
  SYNC_SERVER: string;
  SIGNUP_SERVER: string;
  GOCARDLESS_SERVER: string;
  SIMPLEFIN_SERVER: string;
  PLUGGYAI_SERVER: string;
};

let config: ServerConfig | null = null;

function joinURL(base: string | URL, ...paths: string[]): string {
  const url = new URL(base);
  url.pathname = fs.join(url.pathname, ...paths);
  return url.toString();
}

export function isValidBaseURL(base: string): boolean {
  try {
    return Boolean(new URL(base));
  } catch {
    return false;
  }
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
    try {
      return {
        BASE_SERVER: url,
        SYNC_SERVER: joinURL(url, '/sync'),
        SIGNUP_SERVER: joinURL(url, '/account'),
        GOCARDLESS_SERVER: joinURL(url, '/gocardless'),
        SIMPLEFIN_SERVER: joinURL(url, '/simplefin'),
        PLUGGYAI_SERVER: joinURL(url, '/pluggyai'),
      };
    } catch (error) {
      logger.warn(
        'Unable to parse server URL - using the global config.',
        { config },
        error,
      );
      return config;
    }
  }
  return config;
}
