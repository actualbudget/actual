import { clearServer, initServer } from '#mocks/connection';

import { runBackupTo } from './pipeline';
import { createAccessLostError } from './types';
import type { BackupDestination } from './types';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

function createFakeDestination(
  existing: Array<{ id: string; date: Date }> = [],
) {
  const written: Array<{ name: string; data: Uint8Array }> = [];
  const destination: BackupDestination = {
    kind: 'folder',
    label: 'Backups',
    getStatus: vi.fn(async () => 'ready' as const),
    reconnect: vi.fn(async () => 'ready' as const),
    write: vi.fn(async (name: string, data: Uint8Array) => {
      written.push({ name, data });
    }),
    list: vi.fn(async () => [
      ...existing,
      ...written.map(entry => ({ id: entry.name, date: new Date() })),
    ]),
    remove: vi.fn(async () => undefined),
  };
  return { destination, written };
}

describe('runBackupTo', () => {
  afterEach(async () => {
    await clearServer();
  });

  it('writes the export under a timestamped name', async () => {
    const data = new Uint8Array([1, 2, 3]);
    initServer({ 'export-budget': () => ({ data, warnings: [] }) });
    const { destination, written } = createFakeDestination();

    const result = await runBackupTo(destination);

    expect(result).toEqual({ ok: true, warnings: [] });
    expect(written).toHaveLength(1);
    expect(written[0].name).toMatch(
      /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.zip$/,
    );
    expect(written[0].data).toBe(data);
  });

  it('passes export warnings through', async () => {
    initServer({
      'export-budget': () => ({
        data: new Uint8Array([1]),
        warnings: ['exceeds-import-size-limit'],
      }),
    });
    const { destination } = createFakeDestination();

    const result = await runBackupTo(destination);

    expect(result).toEqual({
      ok: true,
      warnings: ['exceeds-import-size-limit'],
    });
  });

  it('prunes old backups after writing', async () => {
    initServer({
      'export-budget': () => ({ data: new Uint8Array([1]), warnings: [] }),
    });
    // Twelve backups on twelve different past days: only the ten newest
    // survive, so the two oldest are removed.
    const { destination } = createFakeDestination(
      Array.from({ length: 12 }, (_, index) => ({
        id: `day${index}`,
        date: new Date(`2016-12-${String(10 + index).padStart(2, '0')}`),
      })),
    );

    const result = await runBackupTo(destination);

    expect(result.ok).toBe(true);
    expect(destination.list).toHaveBeenCalledTimes(1);
    const removed = vi.mocked(destination.remove).mock.calls.map(([id]) => id);
    expect(removed.sort()).toEqual(['day0', 'day1', 'day2']);
  });

  it('does not write anything when the export fails', async () => {
    initServer({ 'export-budget': () => ({ error: 'internal-error' }) });
    const { destination } = createFakeDestination();

    const result = await runBackupTo(destination);

    expect(result).toEqual({ ok: false, reason: 'export-failed' });
    expect(destination.write).not.toHaveBeenCalled();
  });

  it('reports lost access', async () => {
    initServer({
      'export-budget': () => ({ data: new Uint8Array([1]), warnings: [] }),
    });
    const { destination } = createFakeDestination();
    vi.mocked(destination.write).mockRejectedValue(createAccessLostError());

    const result = await runBackupTo(destination);

    expect(result).toMatchObject({ ok: false, reason: 'access-lost' });
  });

  it('reports other failures as write failures', async () => {
    initServer({
      'export-budget': () => ({ data: new Uint8Array([1]), warnings: [] }),
    });
    const { destination } = createFakeDestination();
    vi.mocked(destination.list).mockRejectedValue(new Error('disk full'));

    const result = await runBackupTo(destination);

    expect(result).toMatchObject({ ok: false, reason: 'write-failed' });
  });
});
