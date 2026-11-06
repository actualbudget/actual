import dns from 'dns';
import { once } from 'node:events';
import { createServer } from 'node:http';

import { fetch } from 'undici';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertUrlAllowed, createSsrfDispatcher } from './ssrf';

vi.mock('dns', () => ({
  default: {
    lookup: vi.fn(),
  },
}));

type LookupCallback = (err: Error | null, addresses: unknown) => void;

function setLookupImpl(handler: (callback: LookupCallback) => void) {
  // dns.lookup has several overloads; the callback is always the last argument.
  vi.mocked(dns.lookup).mockImplementation((...args: unknown[]) => {
    const callback = args[args.length - 1] as LookupCallback;
    handler(callback);
  });
}

function mockDnsLookup(addresses: string[]) {
  // promisify(dns.lookup) with { all: true } calls back with an array.
  setLookupImpl(callback =>
    callback(
      null,
      addresses.map(address => ({ address, family: 4 })),
    ),
  );
}

function mockDnsFailure() {
  setLookupImpl(callback => callback(new Error('ENOTFOUND'), null));
}

describe('assertUrlAllowed', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('allows a public hostname', async () => {
    mockDnsLookup(['8.8.8.8']);
    await expect(
      assertUrlAllowed('https://beta-bridge.simplefin.org/claim/abc'),
    ).resolves.toBeUndefined();
  });

  it('allows a public literal IP without a DNS lookup', async () => {
    await expect(
      assertUrlAllowed('https://8.8.8.8/claim'),
    ).resolves.toBeUndefined();
    expect(dns.lookup).not.toHaveBeenCalled();
  });

  it('blocks the cloud metadata endpoint (link-local literal IP)', async () => {
    await expect(
      assertUrlAllowed('http://169.254.169.254/latest/meta-data/'),
    ).rejects.toThrow(/private\/local IP/);
  });

  it('blocks the cloud metadata endpoint even when private networks are allowed', async () => {
    await expect(
      assertUrlAllowed('http://169.254.169.254/latest/meta-data/', {
        allowPrivateNetwork: true,
      }),
    ).rejects.toThrow(/private\/local IP/);
  });

  it('blocks reserved and broadcast ranges even when private networks are allowed', async () => {
    await expect(
      assertUrlAllowed('http://240.0.0.1/', { allowPrivateNetwork: true }),
    ).rejects.toThrow();
    await expect(
      assertUrlAllowed('http://255.255.255.255/', {
        allowPrivateNetwork: true,
      }),
    ).rejects.toThrow();
  });

  it('blocks loopback literal IPs', async () => {
    await expect(assertUrlAllowed('https://127.0.0.1/claim')).rejects.toThrow();
  });

  it('blocks private literal IPs', async () => {
    await expect(assertUrlAllowed('https://10.0.0.5/claim')).rejects.toThrow();
    await expect(
      assertUrlAllowed('https://192.168.1.1/claim'),
    ).rejects.toThrow();
  });

  it('allows private literal IPs when private networks are allowed', async () => {
    await expect(
      assertUrlAllowed('https://192.168.1.50/accounts', {
        allowPrivateNetwork: true,
      }),
    ).resolves.toBeUndefined();
    await expect(
      assertUrlAllowed('https://10.0.0.5/accounts', {
        allowPrivateNetwork: true,
      }),
    ).resolves.toBeUndefined();
  });

  it('allows loopback when private networks are allowed', async () => {
    await expect(
      assertUrlAllowed('https://127.0.0.1/accounts', {
        allowPrivateNetwork: true,
      }),
    ).resolves.toBeUndefined();
  });

  it('allows a hostname resolving to a private IP when private networks are allowed', async () => {
    mockDnsLookup(['10.1.2.3']);
    await expect(
      assertUrlAllowed('https://my-simplefin.local/accounts', {
        allowPrivateNetwork: true,
      }),
    ).resolves.toBeUndefined();
  });

  it('blocks IPv6 loopback', async () => {
    await expect(assertUrlAllowed('https://[::1]/claim')).rejects.toThrow();
  });

  it('blocks IPv4-mapped IPv6 loopback', async () => {
    await expect(
      assertUrlAllowed('https://[::ffff:127.0.0.1]/claim'),
    ).rejects.toThrow();
  });

  it('blocks a hostname that resolves to a private IP', async () => {
    mockDnsLookup(['10.1.2.3']);
    await expect(
      assertUrlAllowed('https://internal.example.com/'),
    ).rejects.toThrow(/resolving to private\/local IP/);
  });

  it('blocks if any resolved address is private', async () => {
    mockDnsLookup(['8.8.8.8', '127.0.0.1']);
    await expect(
      assertUrlAllowed('https://rebind.example.com/'),
    ).rejects.toThrow();
  });

  it('rejects unresolvable hostnames', async () => {
    mockDnsFailure();
    await expect(
      assertUrlAllowed('https://does-not-exist.example/'),
    ).rejects.toThrow(/Unable to resolve/);
  });

  it('rejects non-http(s) protocols', async () => {
    await expect(assertUrlAllowed('file:///etc/passwd')).rejects.toThrow(
      /disallowed protocol/,
    );
  });

  it('rejects invalid URLs', async () => {
    await expect(assertUrlAllowed('not a url')).rejects.toThrow(/Invalid URL/);
  });
});

const unsafeAddresses = [
  '64:ff9b::c0a8:101', // NAT64 private IPv4
  '64:ff9b::7f00:1', // NAT64 loopback
  '64:ff9b::a9fe:a9fe', // NAT64 well-known prefix
  '64:ff9b:1::a9fe:a9fe', // NAT64 local-use prefix
  '2002:a9fe:a9fe::', // 6to4
  '2001:0:4136:e378:8000:63bf:3fff:fdd2', // Teredo
  '::ffff:0:169.254.169.254', // RFC 6145 translation
  'ff02::1', // multicast
  'fe80::1', // link-local
  '2001:db8::1', // documentation/reserved
  '224.0.0.1', // IPv4 multicast
];

it.each(unsafeAddresses)(
  'blocks %s as a literal and DNS answer in both modes',
  async address => {
    for (const allowPrivateNetwork of [false, true]) {
      const host = address.includes(':') ? `[${address}]` : address;
      await expect(
        assertUrlAllowed(`https://${host}/`, { allowPrivateNetwork }),
      ).rejects.toThrow();
      mockDnsLookup(['8.8.8.8', address]);
      await expect(
        assertUrlAllowed('https://bridge.example/', { allowPrivateNetwork }),
      ).rejects.toThrow();
    }
  },
);

it.each(['2606:4700:4700::1111', '::ffff:8.8.8.8'])(
  'allows public unicast %s',
  async address => {
    await expect(
      assertUrlAllowed(`https://[${address}]/`),
    ).resolves.toBeUndefined();
  },
);

it.each(['::1', 'fd00::1', '::ffff:192.168.1.1'])(
  'permits private %s only when explicitly enabled',
  async address => {
    await expect(assertUrlAllowed(`http://[${address}]/`)).rejects.toThrow();
    await expect(
      assertUrlAllowed(`http://[${address}]/`, { allowPrivateNetwork: true }),
    ).resolves.toBeUndefined();
  },
);

it.each(['100.64.0.1', '100.127.255.254', '::ffff:100.64.0.1'])(
  'permits CGNAT %s as a literal and DNS answer only when explicitly enabled',
  async address => {
    const host = address.includes(':') ? `[${address}]` : address;
    mockDnsLookup(['8.8.8.8', address]);

    for (const url of [`https://${host}/`, 'https://bridge.example/']) {
      await expect(assertUrlAllowed(url)).rejects.toThrow();
      await expect(
        assertUrlAllowed(url, { allowPrivateNetwork: true }),
      ).resolves.toBeUndefined();
    }
  },
);

it.each([false, true])(
  'allows public NAT64 literals and DNS answers (private mode: %s)',
  async allowPrivateNetwork => {
    await expect(
      assertUrlAllowed('https://[64:ff9b::808:808]/', { allowPrivateNetwork }),
    ).resolves.toBeUndefined();
    mockDnsLookup(['64:ff9b::808:808']);
    await expect(
      assertUrlAllowed('https://bridge.example/', { allowPrivateNetwork }),
    ).resolves.toBeUndefined();
  },
);

describe('private network allowlist', () => {
  const options = {
    allowedNetworks: [
      '192.168.1.20',
      '10.20.0.0/16',
      'fd12:3456::/64',
      '127.0.0.1',
    ],
  };

  it.each([
    '192.168.1.20',
    '10.20.1.2',
    '[fd12:3456::5]',
    '[::ffff:192.168.1.20]',
    '127.0.0.1',
  ])('allows the explicitly configured address %s', async host => {
    await expect(
      assertUrlAllowed(`http://${host}/accounts`, options),
    ).resolves.toBeUndefined();
  });
  it.each(['192.168.1.21', '10.21.0.1', '[fd12:3457::1]', '127.0.0.2'])(
    'blocks addresses outside the configured ranges: %s',
    async host => {
      await expect(
        assertUrlAllowed(`http://${host}/accounts`, options),
      ).rejects.toThrow();
    },
  );
  it.each([
    '169.254.169.254',
    '224.0.0.1',
    '240.0.0.1',
    '[fe80::1]',
    '[ff02::1]',
    '[64:ff9b::a9fe:a9fe]',
  ])('never allows reserved or metadata destinations: %s', async host => {
    await expect(
      assertUrlAllowed(`http://${host}/`, {
        allowedNetworks: ['0.0.0.0/0', '::/0'],
      }),
    ).rejects.toThrow();
  });
  it('rejects a hostname with even one unapproved DNS answer', async () => {
    mockDnsLookup(['192.168.1.20', '192.168.1.21']);
    await expect(
      assertUrlAllowed('http://bridge.example', options),
    ).rejects.toThrow();
  });

  it('checks DNS again at connection time and connects only after approval', async () => {
    const received = vi.fn();
    const server = createServer((_req, res) => {
      received();
      res.end('ok');
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Missing test port');
    }
    const url = `http://bridge.example:${address.port}/accounts`;
    const blocked = createSsrfDispatcher({});
    const allowed = createSsrfDispatcher(options);
    try {
      mockDnsLookup(['8.8.8.8']);
      await assertUrlAllowed(url);
      mockDnsLookup(['127.0.0.1']);
      const blockedOptions = { dispatcher: blocked };
      await expect(fetch(url, blockedOptions)).rejects.toThrow();
      expect(received).not.toHaveBeenCalled();
      const allowedOptions = { dispatcher: allowed };
      expect(await (await fetch(url, allowedOptions)).text()).toBe('ok');
      expect(received).toHaveBeenCalledTimes(1);
    } finally {
      await Promise.all([blocked.close(), allowed.close()]);
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve())),
      );
    }
  });
});
