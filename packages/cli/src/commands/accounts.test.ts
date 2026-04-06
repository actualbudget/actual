import * as api from '@actual-app/api';
import { Command } from 'commander';

import { printOutput } from '../output';

import { registerAccountsCommand } from './accounts';

vi.mock('@actual-app/api', () => ({
  getAccounts: vi.fn().mockResolvedValue([]),
  createAccount: vi.fn().mockResolvedValue('new-id'),
  updateAccount: vi.fn().mockResolvedValue(undefined),
  closeAccount: vi.fn().mockResolvedValue(undefined),
  reopenAccount: vi.fn().mockResolvedValue(undefined),
  deleteAccount: vi.fn().mockResolvedValue(undefined),
  getAccountBalance: vi.fn().mockResolvedValue(10000),
}));

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
  registerAccountsCommand(program);
  return program;
}

async function run(args: string[]) {
  const program = createProgram();
  await program.parseAsync(['node', 'test', ...args]);
}

describe('accounts commands', () => {
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

  describe('list', () => {
    it('calls api.getAccounts and prints result', async () => {
      const accounts = [{ id: '1', name: 'Checking' }];
      vi.mocked(api.getAccounts).mockResolvedValue(accounts);

      await run(['accounts', 'list']);

      expect(api.getAccounts).toHaveBeenCalled();
      expect(printOutput).toHaveBeenCalledWith(accounts, undefined);
    });

    it('passes format option to printOutput', async () => {
      vi.mocked(api.getAccounts).mockResolvedValue([]);

      await run(['--format', 'csv', 'accounts', 'list']);

      expect(printOutput).toHaveBeenCalledWith([], 'csv');
    });
  });

  describe('create', () => {
    it('passes name and defaults to api.createAccount', async () => {
      await run(['accounts', 'create', '--name', 'Savings']);

      expect(api.createAccount).toHaveBeenCalledWith(
        { name: 'Savings', offbudget: false },
        0,
      );
      expect(printOutput).toHaveBeenCalledWith({ id: 'new-id' }, undefined);
    });

    it('passes offbudget and balance options', async () => {
      await run([
        'accounts',
        'create',
        '--name',
        'Investments',
        '--offbudget',
        '--balance',
        '50000',
      ]);

      expect(api.createAccount).toHaveBeenCalledWith(
        { name: 'Investments', offbudget: true },
        50000,
      );
    });
  });

  describe('update', () => {
    it('passes fields to api.updateAccount', async () => {
      await run(['accounts', 'update', 'acct-1', '--name', 'NewName']);

      expect(api.updateAccount).toHaveBeenCalledWith('acct-1', {
        name: 'NewName',
      });
      expect(printOutput).toHaveBeenCalledWith(
        { success: true, id: 'acct-1' },
        undefined,
      );
    });

    it('passes offbudget true', async () => {
      await run([
        'accounts',
        'update',
        'acct-1',
        '--name',
        'X',
        '--offbudget',
        'true',
      ]);

      expect(api.updateAccount).toHaveBeenCalledWith('acct-1', {
        name: 'X',
        offbudget: true,
      });
    });

    it('passes offbudget false', async () => {
      await run([
        'accounts',
        'update',
        'acct-1',
        '--name',
        'X',
        '--offbudget',
        'false',
      ]);

      expect(api.updateAccount).toHaveBeenCalledWith('acct-1', {
        name: 'X',
        offbudget: false,
      });
    });

    it('rejects invalid offbudget value', async () => {
      await expect(
        run(['accounts', 'update', 'acct-1', '--offbudget', 'yes']),
      ).rejects.toThrow(
        'Invalid --offbudget: "yes". Expected "true" or "false".',
      );
    });

    it('rejects empty name', async () => {
      await expect(
        run(['accounts', 'update', 'acct-1', '--name', '  ']),
      ).rejects.toThrow('Invalid --name: must be a non-empty string.');
    });

    it('rejects update with no fields', async () => {
      await expect(run(['accounts', 'update', 'acct-1'])).rejects.toThrow(
        'No update fields provided. Use --name or --offbudget.',
      );
    });
  });

  describe('close', () => {
    it('passes transfer options to api.closeAccount', async () => {
      await run([
        'accounts',
        'close',
        'acct-1',
        '--transfer-account',
        'acct-2',
      ]);

      expect(api.closeAccount).toHaveBeenCalledWith(
        'acct-1',
        'acct-2',
        undefined,
      );
    });

    it('passes transfer category', async () => {
      await run([
        'accounts',
        'close',
        'acct-1',
        '--transfer-category',
        'cat-1',
      ]);

      expect(api.closeAccount).toHaveBeenCalledWith(
        'acct-1',
        undefined,
        'cat-1',
      );
    });
  });

  describe('reopen', () => {
    it('calls api.reopenAccount', async () => {
      await run(['accounts', 'reopen', 'acct-1']);

      expect(api.reopenAccount).toHaveBeenCalledWith('acct-1');
      expect(printOutput).toHaveBeenCalledWith(
        { success: true, id: 'acct-1' },
        undefined,
      );
    });
  });

  describe('delete', () => {
    it('calls api.deleteAccount', async () => {
      await run(['accounts', 'delete', 'acct-1']);

      expect(api.deleteAccount).toHaveBeenCalledWith('acct-1');
      expect(printOutput).toHaveBeenCalledWith(
        { success: true, id: 'acct-1' },
        undefined,
      );
    });
  });

  describe('balance', () => {
    it('calls api.getAccountBalance without cutoff', async () => {
      await run(['accounts', 'balance', 'acct-1']);

      expect(api.getAccountBalance).toHaveBeenCalledWith('acct-1', undefined);
      expect(printOutput).toHaveBeenCalledWith(
        { id: 'acct-1', balance: 10000 },
        undefined,
      );
    });

    it('calls api.getAccountBalance with cutoff date', async () => {
      await run(['accounts', 'balance', 'acct-1', '--cutoff', '2025-01-15']);

      expect(api.getAccountBalance).toHaveBeenCalledWith(
        'acct-1',
        new Date('2025-01-15'),
      );
    });
  });
});
