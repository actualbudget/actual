import * as api from '@actual-app/api';
import { Command } from 'commander';

import { printOutput } from '../output';

import { parseOrderBy, registerQueryCommand } from './query';

vi.mock('@actual-app/api', () => {
  const queryObj = {
    select: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    calculate: vi.fn().mockReturnThis(),
  };
  return {
    q: vi.fn().mockReturnValue(queryObj),
    aqlQuery: vi.fn().mockResolvedValue({ data: [] }),
  };
});

vi.mock('../connection', () => ({
  withConnection: vi.fn((_opts, fn) => fn()),
}));

vi.mock('../output', () => ({
  printOutput: vi.fn(),
}));

function createProgram(): Command {
  const program = new Command();
  program.option('--format <format>');
  program.option('--server-url <url>');
  program.option('--password <pw>');
  program.option('--session-token <token>');
  program.option('--sync-id <id>');
  program.option('--data-dir <dir>');
  program.option('--verbose');
  program.exitOverride();
  registerQueryCommand(program);
  return program;
}

async function run(args: string[]) {
  const program = createProgram();
  await program.parseAsync(['node', 'test', ...args]);
}

function getQueryObj() {
  return vi.mocked(api.q).mock.results[0]?.value;
}

describe('parseOrderBy', () => {
  it('parses plain field names', () => {
    expect(parseOrderBy('date')).toEqual(['date']);
  });

  it('parses field:desc', () => {
    expect(parseOrderBy('date:desc')).toEqual([{ date: 'desc' }]);
  });

  it('parses field:asc', () => {
    expect(parseOrderBy('amount:asc')).toEqual([{ amount: 'asc' }]);
  });

  it('parses multiple mixed fields', () => {
    expect(parseOrderBy('date:desc,amount:asc,id')).toEqual([
      { date: 'desc' },
      { amount: 'asc' },
      'id',
    ]);
  });

  it('throws on invalid direction', () => {
    expect(() => parseOrderBy('date:backwards')).toThrow(
      'Invalid order direction "backwards"',
    );
  });

  it('throws on empty field', () => {
    expect(() => parseOrderBy('date,,amount')).toThrow('empty field');
  });
});

describe('query commands', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  describe('run', () => {
    it('builds a basic query from flags', async () => {
      await run([
        'query',
        'run',
        '--table',
        'transactions',
        '--select',
        'date,amount',
        '--limit',
        '5',
      ]);

      expect(api.q).toHaveBeenCalledWith('transactions');
      const qObj = getQueryObj();
      expect(qObj.select).toHaveBeenCalledWith(['date', 'amount']);
      expect(qObj.limit).toHaveBeenCalledWith(5);
    });

    it('rejects unknown table name', async () => {
      await expect(
        run(['query', 'run', '--table', 'nonexistent']),
      ).rejects.toThrow('Unknown table "nonexistent"');
    });

    it('parses order-by with desc direction', async () => {
      await run([
        'query',
        'run',
        '--table',
        'transactions',
        '--order-by',
        'date:desc,amount:asc',
      ]);

      const qObj = getQueryObj();
      expect(qObj.orderBy).toHaveBeenCalledWith([
        { date: 'desc' },
        { amount: 'asc' },
      ]);
    });

    it('passes --filter as JSON', async () => {
      await run([
        'query',
        'run',
        '--table',
        'transactions',
        '--filter',
        '{"amount":{"$lt":0}}',
      ]);

      const qObj = getQueryObj();
      expect(qObj.filter).toHaveBeenCalledWith({ amount: { $lt: 0 } });
    });
  });

  describe('--last flag', () => {
    it('sets default table, select, orderBy, and limit', async () => {
      await run(['query', 'run', '--last', '10']);

      expect(api.q).toHaveBeenCalledWith('transactions');
      const qObj = getQueryObj();
      expect(qObj.select).toHaveBeenCalledWith([
        'date',
        'account.name',
        'payee.name',
        'category.name',
        'amount',
        'notes',
      ]);
      expect(qObj.orderBy).toHaveBeenCalledWith([{ date: 'desc' }]);
      expect(qObj.limit).toHaveBeenCalledWith(10);
    });

    it('allows explicit --select override', async () => {
      await run(['query', 'run', '--last', '5', '--select', 'date,amount']);

      const qObj = getQueryObj();
      expect(qObj.select).toHaveBeenCalledWith(['date', 'amount']);
    });

    it('allows explicit --order-by override', async () => {
      await run(['query', 'run', '--last', '5', '--order-by', 'amount:asc']);

      const qObj = getQueryObj();
      expect(qObj.orderBy).toHaveBeenCalledWith([{ amount: 'asc' }]);
    });

    it('allows --table transactions explicitly', async () => {
      await run(['query', 'run', '--last', '5', '--table', 'transactions']);

      expect(api.q).toHaveBeenCalledWith('transactions');
    });

    it('errors if --table is not transactions', async () => {
      await expect(
        run(['query', 'run', '--last', '5', '--table', 'accounts']),
      ).rejects.toThrow('--last implies --table transactions');
    });

    it('errors if --limit is also set', async () => {
      await expect(
        run(['query', 'run', '--last', '5', '--limit', '10']),
      ).rejects.toThrow('--last and --limit are mutually exclusive');
    });
  });

  describe('--count flag', () => {
    it('uses calculate with $count', async () => {
      vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: 42 });

      await run(['query', 'run', '--table', 'transactions', '--count']);

      const qObj = getQueryObj();
      expect(qObj.calculate).toHaveBeenCalledWith({ $count: '*' });
      expect(printOutput).toHaveBeenCalledWith({ count: 42 }, undefined);
    });

    it('errors if --select is also set', async () => {
      await expect(
        run([
          'query',
          'run',
          '--table',
          'transactions',
          '--count',
          '--select',
          'date',
        ]),
      ).rejects.toThrow('--count and --select are mutually exclusive');
    });
  });

  describe('--where alias', () => {
    it('works the same as --filter', async () => {
      await run([
        'query',
        'run',
        '--table',
        'transactions',
        '--where',
        '{"amount":{"$gt":0}}',
      ]);

      const qObj = getQueryObj();
      expect(qObj.filter).toHaveBeenCalledWith({ amount: { $gt: 0 } });
    });

    it('errors if both --where and --filter are provided', async () => {
      await expect(
        run([
          'query',
          'run',
          '--table',
          'transactions',
          '--where',
          '{}',
          '--filter',
          '{}',
        ]),
      ).rejects.toThrow('--where and --filter are mutually exclusive');
    });
  });

  describe('--offset flag', () => {
    it('passes offset through to query', async () => {
      await run([
        'query',
        'run',
        '--table',
        'transactions',
        '--offset',
        '20',
        '--limit',
        '10',
      ]);

      const qObj = getQueryObj();
      expect(qObj.offset).toHaveBeenCalledWith(20);
      expect(qObj.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('--group-by flag', () => {
    it('passes group-by through to query', async () => {
      await run([
        'query',
        'run',
        '--table',
        'transactions',
        '--group-by',
        'category.name',
        '--select',
        'category.name,amount',
      ]);

      const qObj = getQueryObj();
      expect(qObj.groupBy).toHaveBeenCalledWith(['category.name']);
    });
  });

  describe('tables subcommand', () => {
    it('lists available tables', async () => {
      await run(['query', 'tables']);

      expect(printOutput).toHaveBeenCalledWith(
        expect.arrayContaining([
          { name: 'transactions' },
          { name: 'accounts' },
          { name: 'categories' },
          { name: 'payees' },
        ]),
        undefined,
      );
    });
  });

  describe('fields subcommand', () => {
    it('lists fields for a known table', async () => {
      await run(['query', 'fields', 'accounts']);

      const output = vi.mocked(printOutput).mock.calls[0][0] as Array<{
        name: string;
        type: string;
      }>;
      expect(output).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'id', type: 'id' }),
          expect.objectContaining({ name: 'name', type: 'string' }),
        ]),
      );
    });

    it('errors on unknown table', async () => {
      await expect(run(['query', 'fields', 'unknown'])).rejects.toThrow(
        'Unknown table "unknown"',
      );
    });
  });
});
