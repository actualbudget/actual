afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('parses comma-separated SimpleFIN networks from the environment', async () => {
  vi.stubEnv(
    'ACTUAL_SIMPLEFIN_ALLOWED_NETWORKS',
    '192.168.1.20, fd12:3456::/64',
  );
  const { config } = await import('./load-config');
  expect(config.get('simplefinAllowedNetworks')).toEqual([
    '192.168.1.20',
    'fd12:3456::/64',
  ]);
});

it.each(['192.168.1.0/99', 'bridge.example', '*'])(
  'rejects invalid network configuration at startup: %s',
  async value => {
    vi.stubEnv('ACTUAL_SIMPLEFIN_ALLOWED_NETWORKS', value);
    await expect(import('./load-config')).rejects.toThrow();
  },
);
