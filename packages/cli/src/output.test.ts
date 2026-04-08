import { formatOutput, printOutput } from './output';

describe('formatOutput', () => {
  describe('json (default)', () => {
    it('pretty-prints with 2-space indent', () => {
      const data = { a: 1, b: 'two' };
      expect(formatOutput(data)).toBe(JSON.stringify(data, null, 2));
    });

    it('is the default format', () => {
      expect(formatOutput({ x: 1 })).toBe(formatOutput({ x: 1 }, 'json'));
    });

    it('handles arrays', () => {
      const data = [1, 2, 3];
      expect(formatOutput(data, 'json')).toBe('[\n  1,\n  2,\n  3\n]');
    });

    it('handles null', () => {
      expect(formatOutput(null, 'json')).toBe('null');
    });
  });

  describe('table', () => {
    it('renders an object as key-value table', () => {
      const result = formatOutput({ name: 'Alice', age: 30 }, 'table');
      expect(result).toContain('name');
      expect(result).toContain('Alice');
      expect(result).toContain('age');
      expect(result).toContain('30');
    });

    it('renders an array of objects as columnar table', () => {
      const data = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ];
      const result = formatOutput(data, 'table');
      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('1');
      expect(result).toContain('a');
      expect(result).toContain('2');
      expect(result).toContain('b');
    });

    it('returns "(no results)" for empty array', () => {
      expect(formatOutput([], 'table')).toBe('(no results)');
    });

    it('returns String(data) for scalar values', () => {
      expect(formatOutput(42, 'table')).toBe('42');
      expect(formatOutput('hello', 'table')).toBe('hello');
      expect(formatOutput(true, 'table')).toBe('true');
    });

    it('handles null/undefined values in objects', () => {
      const data = [{ a: null, b: undefined }];
      const result = formatOutput(data, 'table');
      expect(result).toContain('a');
      expect(result).toContain('b');
    });

    it('formats amount fields as decimal values', () => {
      const data = [{ name: 'Groceries', amount: -250000 }];
      const result = formatOutput(data, 'table');
      expect(result).toContain('-2500.00');
      expect(result).not.toContain('-250000');
    });

    it('formats balance fields as decimal values', () => {
      const data = [{ id: 'acc1', balance: 166500 }];
      const result = formatOutput(data, 'table');
      expect(result).toContain('1665.00');
    });

    it('formats budgeted and spent fields as decimal values', () => {
      const data = [{ budgeted: 50000, spent: -32150 }];
      const result = formatOutput(data, 'table');
      expect(result).toContain('500.00');
      expect(result).toContain('-321.50');
    });

    it('does not format non-amount numeric fields', () => {
      const data = [{ id: 12345, sort_order: 100 }];
      const result = formatOutput(data, 'table');
      expect(result).toContain('12345');
      expect(result).toContain('100');
    });
  });

  describe('csv', () => {
    it('renders array of objects as header + data rows', () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const result = formatOutput(data, 'csv');
      const lines = result.split('\n');
      expect(lines[0]).toBe('id,name');
      expect(lines[1]).toBe('1,Alice');
      expect(lines[2]).toBe('2,Bob');
    });

    it('renders single object as header + single row', () => {
      const result = formatOutput({ x: 10, y: 20 }, 'csv');
      const lines = result.split('\n');
      expect(lines[0]).toBe('x,y');
      expect(lines[1]).toBe('10,20');
    });

    it('returns empty string for empty array', () => {
      expect(formatOutput([], 'csv')).toBe('');
    });

    it('returns String(data) for scalar values', () => {
      expect(formatOutput(42, 'csv')).toBe('42');
      expect(formatOutput('hello', 'csv')).toBe('hello');
    });

    it('escapes commas by quoting', () => {
      const data = [{ val: 'a,b' }];
      expect(formatOutput(data, 'csv')).toBe('val\n"a,b"');
    });

    it('escapes double quotes by doubling them', () => {
      const data = [{ val: 'say "hi"' }];
      expect(formatOutput(data, 'csv')).toBe('val\n"say ""hi"""');
    });

    it('escapes newlines by quoting', () => {
      const data = [{ val: 'line1\nline2' }];
      expect(formatOutput(data, 'csv')).toBe('val\n"line1\nline2"');
    });

    it('handles null/undefined values', () => {
      const data = [{ a: null, b: undefined }];
      const result = formatOutput(data, 'csv');
      const lines = result.split('\n');
      expect(lines[0]).toBe('a,b');
    });

    it('formats amount fields as decimal values', () => {
      const data = [{ name: 'Coffee', amount: -2500 }];
      const result = formatOutput(data, 'csv');
      const lines = result.split('\n');
      expect(lines[0]).toBe('name,amount');
      expect(lines[1]).toBe('Coffee,-25.00');
    });

    it('does not format amount fields in json output', () => {
      const data = [{ amount: 166500 }];
      const result = formatOutput(data, 'json');
      expect(result).toContain('166500');
      expect(result).not.toContain('1665.00');
    });
  });
});

describe('printOutput', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('writes formatted output followed by newline', () => {
    printOutput({ a: 1 }, 'json');
    expect(writeSpy).toHaveBeenCalledWith(
      JSON.stringify({ a: 1 }, null, 2) + '\n',
    );
  });

  it('defaults to json format', () => {
    printOutput([1, 2]);
    expect(writeSpy).toHaveBeenCalledWith(
      JSON.stringify([1, 2], null, 2) + '\n',
    );
  });

  it('supports table format', () => {
    printOutput([], 'table');
    expect(writeSpy).toHaveBeenCalledWith('(no results)\n');
  });

  it('supports csv format', () => {
    printOutput([], 'csv');
    expect(writeSpy).toHaveBeenCalledWith('\n');
  });
});
