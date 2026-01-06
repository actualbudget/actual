import { unicodeLike } from './unicodeLike';

describe('unicode LIKE functionality', () => {
  it('empty pattern should not match to a value', () => {
    const result = unicodeLike(null, 'value');

    expect(result).toBe(0);
  });

  it('empty pattern should not match to null', () => {
    const result = unicodeLike(null, null);

    expect(result).toBe(0);
  });

  it('should match special characters', () => {
    // oxlint-disable-next-line no-template-curly-in-string
    const result = unicodeLike('.*+^${}()|[]\\', '.*+^${}()|[]\\');

    expect(result).toBe(1);
  });

  it('should use ? as the single character placeholder', () => {
    const result = unicodeLike('t?st', 'test');

    expect(result).toBe(1);
  });

  it('should use % as the zero-or-more characters placeholder', () => {
    const result = unicodeLike('t%st', 'te123st');

    expect(result).toBe(1);
  });

  it('should ignore case for unicode', () => {
    const result = unicodeLike('á', 'Ábcdefg');

    expect(result).toBe(1);
  });

  it('should ignore case for ascii', () => {
    const result = unicodeLike('a', 'Abcdefg');

    expect(result).toBe(1);
  });

  it('should treat null value as empty string', () => {
    const result = unicodeLike('%', null);

    expect(result).toBe(1);
  });

  it('should not match null value to the string "null"', () => {
    const result = unicodeLike('null', null);

    expect(result).toBe(0);
  });
});
