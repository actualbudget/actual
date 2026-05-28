import dns from 'dns';
import { promisify } from 'util';

import ipaddr from 'ipaddr.js';

const dnsLookup = promisify(dns.lookup);

// IP ranges (as classified by ipaddr.js) that must never be reachable from
// server-side requests to user-controlled URLs. linkLocal covers the cloud
// metadata endpoint (169.254.169.254).
const BLOCKED_IP_RANGES = [
  'private',
  'loopback',
  'linkLocal',
  'uniqueLocal',
  'unspecified',
  'reserved',
  'broadcast',
];

function isBlockedIp(address: string): boolean {
  if (!ipaddr.isValid(address)) {
    return false;
  }

  // process() normalizes IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  // back to their IPv4 form so their range is classified correctly.
  return BLOCKED_IP_RANGES.includes(ipaddr.process(address).range());
}

/**
 * Validate that a URL is safe to make a server-side request to, guarding
 * against SSRF. Only http(s) URLs are permitted, and the hostname is resolved
 * via DNS so that hostnames pointing at private/local/link-local addresses are
 * rejected as well as literal IPs. Throws if the URL is not allowed.
 */
export async function assertUrlAllowed(targetUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`Blocked request to disallowed protocol: ${url.protocol}`);
  }

  // URL keeps the surrounding brackets on IPv6 hosts (e.g. "[::1]"); strip
  // them so the address can be parsed and resolved.
  const hostname = url.hostname.replace(/^\[|\]$/g, '');

  // Literal IP address: check it directly without a DNS lookup.
  if (ipaddr.isValid(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error(`Blocked request to private/local IP: ${hostname}`);
    }
    return;
  }

  // Hostname: resolve every address it points to and reject if any is blocked.
  let addresses: { address: string }[];
  try {
    addresses = await dnsLookup(hostname, { all: true });
  } catch {
    throw new Error(`Unable to resolve host: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new Error(`Unable to resolve host: ${hostname}`);
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new Error(
        `Blocked request to host resolving to private/local IP: ${hostname} (${address})`,
      );
    }
  }
}
