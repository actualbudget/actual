import { buildCsv, escapeCsvField } from './csv';

describe('escapeCsvField', () => {
  it('returns plain strings unchanged', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  it('wraps fields containing commas in double quotes', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });

  it('wraps fields containing double quotes and escapes them', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps fields containing newlines in double quotes', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('prefixes = to prevent formula injection', () => {
    expect(escapeCsvField('=SUM(A1)')).toBe("'=SUM(A1)");
  });

  it('prefixes + to prevent formula injection', () => {
    expect(escapeCsvField('+cmd')).toBe("'+cmd");
  });

  it('does not prefix plain negative numbers', () => {
    expect(escapeCsvField('-1100.00')).toBe('-1100.00');
  });

  it('prefixes @ to prevent formula injection', () => {
    expect(escapeCsvField('@SUM')).toBe("'@SUM");
  });

  it('prefixes tab character to prevent formula injection', () => {
    expect(escapeCsvField('\tdata')).toBe("'\tdata");
  });

  it('applies both formula prefix and quote wrapping when needed', () => {
    expect(escapeCsvField('=A,B')).toBe('"\'=A,B"');
  });
});

describe('buildCsv', () => {
  it('produces a header row followed by data rows', () => {
    const result = buildCsv(
      ['Name', 'Value'],
      [
        ['foo', '1'],
        ['bar', '2'],
      ],
    );
    expect(result).toBe('Name,Value\nfoo,1\nbar,2');
  });

  it('produces only a header row for empty data', () => {
    const result = buildCsv(['A', 'B'], []);
    expect(result).toBe('A,B');
  });

  it('escapes fields in both headers and rows', () => {
    const result = buildCsv(['Col,1'], [['=danger']]);
    expect(result).toBe('"Col,1"\n\'=danger');
  });
});
