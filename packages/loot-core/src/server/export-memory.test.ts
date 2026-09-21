import type { Mock } from 'vitest';

const { readFile, exportDatabase, getPrefs } = vi.hoisted(
  (): { readFile: Mock; exportDatabase: Mock; getPrefs: Mock } => ({
    readFile: vi.fn(),
    exportDatabase: vi.fn(),
    getPrefs: vi.fn(),
  }),
);
vi.mock('#platform/server/fs', () => ({
  getBudgetDir: () => '/budget',
  join: (...parts: string[]) => parts.join('/'),
  readFile,
}));
vi.mock('#platform/server/sqlite', () => ({
  openDatabase: vi.fn(),
  execQuery: vi.fn(),
  closeDatabase: vi.fn(),
  exportDatabase,
}));
vi.mock('#platform/server/memory', () => ({ getAvailableMemory: () => 100 }));
vi.mock('#server/prefs', () => ({ getPrefs }));

it.each([true, false])(
  'warns about actual database size (protected: %s)',
  async protectedFile => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01'));
    onTestFinished(() => {
      vi.useRealTimers();
    });
    vi.resetModules();
    const { exportBuffer } = await import('./cloud-storage');
    getPrefs.mockReturnValue({
      id: 'budget',
      budgetName: 'Test',
      amountEncoding: protectedFile ? 'encoding' : undefined,
    });
    readFile.mockImplementation(async (path: string) =>
      path.endsWith('metadata.json') ? '{}' : Buffer.alloc(200),
    );
    exportDatabase.mockResolvedValue(Buffer.alloc(200));
    expect((await exportBuffer({ alreadyMutating: true }))?.warnings).toContain(
      'may-exceed-available-memory',
    );
    exportDatabase.mockResolvedValue(Buffer.alloc(50));
    expect((await exportBuffer({ alreadyMutating: true }))?.warnings).toEqual(
      [],
    );
  },
);
