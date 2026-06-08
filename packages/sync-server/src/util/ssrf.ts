import { lookup as dnsLookup } from 'node:dns/promises';

import ipaddr from 'ipaddr.js';

// IP ranges (as classified by ipaddr.js) that are never a legitimate
// destination and are the highest-risk SSRF targets, so they are blocked
// unconditionally. linkLocal covers the cloud metadata endpoint
// (169.254.169.254) — the credential-theft vector this protection primarily
// guards against — and no real service is hosted on the reserved, broadcast or
// unspecified ranges.
const ALWAYS_BLOCKED_IP_RANGES = [
  'linkLocal',
  'unspecified',
  'reserved',
  'broadcast',
];

// Private-network ranges (LAN, loopback, IPv6 unique-local). These are blocked
// by default, but self-hosters legitimately run services such as their own
// SimpleFIN bridge on them, so callers that expect to reach private
// infrastructure can opt in with { allowPrivateNetwork: true }. Trusting the
// local network by default keeps self-hosting working out of the box; the
// always-blocked ranges above still close the worst-case (metadata) attack.
const PRIVATE_IP_RANGES = ['private', 'loopback', 'uniqueLocal'];

type SsrfOptions = {
  // Allow requests to private/loopback/unique-local addresses. Defaults to
  // false (strict). Set by callers like the SimpleFIN integration whose
  // upstream may be a self-hosted server on the local network.
  allowPrivateNetwork?: boolean;
};

/**
 * Return true if the given address is a literal IP in one of the blocked
 * ranges (link-local/reserved/etc, plus private ranges unless
 * allowPrivateNetwork is set). Non-IP strings (e.g. hostnames) return false,
 * so callers can pass a URL hostname directly.
 */
export function isBlockedIp(
  address: string,
  { allowPrivateNetwork = false }: SsrfOptions = {},
): boolean {
  if (!ipaddr.isValid(address)) {
    return false;
  }

  // process() normalizes IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  // back to their IPv4 form so their range is classified correctly.
  const range = ipaddr.process(address).range();

  if (ALWAYS_BLOCKED_IP_RANGES.includes(range)) {
    return true;
  }

  return !allowPrivateNetwork && PRIVATE_IP_RANGES.includes(range);
}

/**
 * Validate that a URL is safe to make a server-side request to, guarding
 * against SSRF. Only http(s) URLs are permitted, and the hostname is resolved
 * via DNS so that hostnames pointing at private/local/link-local addresses are
 * rejected as well as literal IPs. Throws if the URL is not allowed.
 *
 * Pass { allowPrivateNetwork: true } for callers (e.g. SimpleFIN) whose
 * upstream may legitimately be a self-hosted server on the local network; the
 * always-blocked ranges (cloud metadata, reserved, broadcast) remain blocked
 * regardless.
 */
export async function assertUrlAllowed(
  targetUrl: string,
  options: SsrfOptions = {},
): Promise<void> {
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
    if (isBlockedIp(hostname, options)) {
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
    if (isBlockedIp(address, options)) {
      throw new Error(
        `Blocked request to host resolving to private/local IP: ${hostname} (${address})`,
      );
    }
  }
}
