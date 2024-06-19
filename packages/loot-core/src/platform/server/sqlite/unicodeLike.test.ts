import { UnicodeLike } from './unicodeLike';

describe('unicode LIKE functionality', () => {
  it('empty pattern should not match to a value', () => {
    const result = UnicodeLike(null, 'value');

    expect(result).toBe(0);
  });

  it('empty pattern should not match to null', () => {
    const result = UnicodeLike(null, null);

    expect(result).toBe(0);
  });

  it('should match special characters', () => {
    const result = UnicodeLike('.*+^${}()|[]\\', '.*+^${}()|[]\\');

    expect(result).toBe(1);
  });

  it('should use ? as the single character placeholder', () => {
    const result = UnicodeLike('t?st', 'test');

    expect(result).toBe(1);
  });

  it('should use % as the zero-or-more characters placeholder', () => {
    const result = UnicodeLike('t%st', 'te123st');

    expect(result).toBe(1);
  });

  it('should ignore case for unicode', () => {
    const result = UnicodeLike('á', 'Ábcdefg');

    expect(result).toBe(1);
  });

  it('should ignore case for ascii', () => {
    const result = UnicodeLike('a', 'Abcdefg');

    expect(result).toBe(1);
  });

  it('should treat null value as empty string', () => {
    const result = UnicodeLike('%', null);

    expect(result).toBe(1);
  });

  it('should not match null value to the string “null”', () => {
    const result = UnicodeLike('null', null);

    expect(result).toBe(0);
  });
});
