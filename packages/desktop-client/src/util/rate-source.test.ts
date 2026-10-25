import { rateSourceName } from './rate-source';

it('shows a provider without the stored plugin namespace', () => {
  expect(rateSourceName('plugin:exchange-api')).toBe('exchange-api');
  expect(rateSourceName('manual')).toBe('manual');
});
