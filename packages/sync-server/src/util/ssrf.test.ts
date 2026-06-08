import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertUrlAllowed } from './ssrf';

const lookupMock = vi.hoisted(() => vi.fn());

vi.mock('node:dns/promises', () => ({ lookup: lookupMock }));

function mockDnsLookup(addresses: string[]) {
  lookupMock.mockResolvedValue(
    addresses.map(address => ({ address, family: 4 })),
  );
}

function mockDnsFailure() {
  lookupMock.mockRejectedValue(new Error('ENOTFOUND'));
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
    expect(lookupMock).not.toHaveBeenCalled();
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
