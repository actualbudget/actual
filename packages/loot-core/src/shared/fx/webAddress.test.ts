import { isWebAddress } from './webAddress';

describe('isWebAddress', () => {
  it.each([
    ['https://api.frankfurter.dev', true],
    ['http://localhost:8080/', true],
    ['api.frankfurter.dev', false],
    ['ftp://rates.example.com', false],
    ['mailto:rates@example.com', false],
  ])('accepts %s: %s', (value, expected) => {
    expect(isWebAddress(value)).toBe(expected);
  });
});
