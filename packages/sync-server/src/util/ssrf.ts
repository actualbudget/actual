import dns from 'dns';
import { promisify } from 'util';

import ipaddr from 'ipaddr.js';
import { Agent } from 'undici';

const dnsLookup = promisify(dns.lookup);
const NAT64_PREFIX = ipaddr.IPv6.parseCIDR('64:ff9b::/96');

// Only public unicast is allowed by default. Private-network mode additionally
// permits these classes. Except for public IPv4 via the well-known NAT64 prefix,
// neither mode permits transition, multicast, link-local,
// or reserved addresses.
const PRIVATE_IP_RANGES = [
  'private',
  'loopback',
  'uniqueLocal',
  'carrierGradeNat',
];

type SsrfOptions = {
  // Allow requests to private/loopback/unique-local/CGNAT addresses. Defaults to
  // false (strict). Use allowedNetworks for administrator-approved exceptions.
  allowPrivateNetwork?: boolean;
  // Only private classes may be exempted; always-blocked ranges stay blocked.
  allowedNetworks?: string[];
};

/**
 * Return true if the given address is a literal IP in one of the blocked
 * ranges (link-local/reserved/etc, plus private ranges unless
 * allowPrivateNetwork is set). Non-IP strings (e.g. hostnames) return false,
 * so callers can pass a URL hostname directly.
 */
export function isBlockedIp(
  address: string,
  { allowPrivateNetwork = false, allowedNetworks = [] }: SsrfOptions = {},
): boolean {
  if (!ipaddr.isValid(address)) {
    return false;
  }

  // process() normalizes IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  // back to their IPv4 form so their range is classified correctly.
  const parsed = ipaddr.process(address);
  if (parsed instanceof ipaddr.IPv6 && parsed.match(NAT64_PREFIX)) {
    // The well-known NAT64 prefix is only for globally routable IPv4.
    return (
      ipaddr.fromByteArray(parsed.toByteArray().slice(12)).range() !== 'unicast'
    );
  }
  const range = parsed.range();

  return (
    range !== 'unicast' &&
    !(
      PRIVATE_IP_RANGES.includes(range) &&
      (allowPrivateNetwork ||
        allowedNetworks.some(network => {
          const [subnet, prefix] = parseAllowedNetwork(network);
          return (
            parsed.kind() === subnet.kind() && parsed.match(subnet, prefix)
          );
        }))
    )
  );
}

/**
 * Validate that a URL is safe to make a server-side request to, guarding
 * against SSRF. Only http(s) URLs are permitted, and the hostname is resolved
 * via DNS so that hostnames pointing at private/local/link-local addresses are
 * rejected as well as literal IPs. Throws if the URL is not allowed.
 *
 * Use allowedNetworks for specific private IPs or CIDR ranges; the
 * other address classes (including transition, multicast and link-local) remain blocked
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

// Validate configuration at startup as well as when matching addresses.
export function parseAllowedNetwork(network: string) {
  if (network.includes('/')) {
    return ipaddr.parseCIDR(network);
  }
  const address = ipaddr.parse(network);
  return [address, address.kind() === 'ipv4' ? 32 : 128] as const;
}

// Validate the addresses used by the socket, avoiding a second unchecked DNS
// resolution after assertUrlAllowed. Literal IPs are checked by assertUrlAllowed.
export function createSsrfDispatcher(options: SsrfOptions) {
  return new Agent({
    connect: {
      lookup(hostname, lookupOptions, callback) {
        dns.lookup(
          hostname,
          { ...lookupOptions, all: true },
          (error, addresses) => {
            if (error) {
              callback(error, []);
            } else if (
              !addresses.length ||
              addresses.some(({ address }) => isBlockedIp(address, options))
            ) {
              callback(new Error('Blocked request to private/local IP'), []);
            } else if (lookupOptions.all) {
              callback(null, addresses);
            } else {
              callback(null, addresses[0].address, addresses[0].family);
            }
          },
        );
      },
    },
  });
}
