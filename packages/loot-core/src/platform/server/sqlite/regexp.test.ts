import { regexp } from './regexp';

describe('REGEXP functionality', () => {
  it('should match a valid pattern', () => {
    expect(regexp('n.', 'not empty string')).toBe(1);
    expect(regexp('^#\\d+$', '#123')).toBe(1);
  });

  it('should not match a valid pattern that does not apply', () => {
    expect(regexp('^#\\d+$', 'no number')).toBe(0);
  });

  it('should treat null text as an empty string', () => {
    expect(regexp('^$', null)).toBe(1);
    expect(regexp('a', null)).toBe(0);
  });

  it('should not match anything with an invalid pattern', () => {
    expect(regexp('\\', '\\')).toBe(0);
    expect(regexp('asdf\\', 'asdf\\')).toBe(0);
    expect(regexp('[', '[')).toBe(0);
    expect(regexp('(', null)).toBe(0);
  });
});
