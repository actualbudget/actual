import type { CleanupTemplate } from '@actual-app/core/types/models/cleanup-templates';

export type GlobalCleanup = {
  send: boolean;
  take: boolean;
  weight: number;
};

export type GroupCleanup = {
  groupId: string;
  send: boolean;
  take: boolean;
  weight: number;
  // engine's `overspend` role — group-only, caps the take at the overspend amount
  overspendOnly: boolean;
};

export type CleanupConfig = {
  global: GlobalCleanup;
  groups: GroupCleanup[];
};

export const emptyCleanupConfig = (): CleanupConfig => ({
  global: { send: false, take: false, weight: 1 },
  groups: [],
});

const isCleared = (config: CleanupConfig): boolean =>
  !config.global.send &&
  !config.global.take &&
  config.groups.every(g => !g.send && !g.take);

export function cleanupToConfig(cleanup: CleanupTemplate[]): CleanupConfig {
  const config = emptyCleanupConfig();
  const groupScopes = new Map<string, GroupCleanup>();

  for (const row of cleanup) {
    if (row.role === 'source') {
      if (row.groupId === null) {
        config.global.send = true;
      } else {
        const g = ensureGroup(groupScopes, row.groupId);
        g.send = true;
      }
    } else if (row.role === 'sink') {
      if (row.groupId === null) {
        config.global.take = true;
        config.global.weight = row.weight;
      } else {
        const g = ensureGroup(groupScopes, row.groupId);
        g.take = true;
        g.weight = row.weight;
        // a sink wins over a stray prior overspend row for the same group
        g.overspendOnly = false;
      }
    } else {
      const g = ensureGroup(groupScopes, row.groupId);
      // don't downgrade a real sink row already recorded for this group
      if (!g.take) {
        g.take = true;
        g.overspendOnly = true;
      }
    }
  }

  config.groups = Array.from(groupScopes.values());
  return config;
}

function ensureGroup(
  map: Map<string, GroupCleanup>,
  groupId: string,
): GroupCleanup {
  const existing = map.get(groupId);
  if (existing) return existing;
  const fresh: GroupCleanup = {
    groupId,
    send: false,
    take: false,
    weight: 1,
    overspendOnly: false,
  };
  map.set(groupId, fresh);
  return fresh;
}

export function configToCleanup(config: CleanupConfig): CleanupTemplate[] {
  if (isCleared(config)) return [];

  const rows: CleanupTemplate[] = [];

  if (config.global.send) rows.push({ role: 'source', groupId: null });
  if (config.global.take) {
    rows.push({ role: 'sink', groupId: null, weight: config.global.weight });
  }

  for (const g of config.groups) {
    if (g.send) rows.push({ role: 'source', groupId: g.groupId });
    if (g.take) {
      rows.push(
        g.overspendOnly
          ? { role: 'overspend', groupId: g.groupId }
          : { role: 'sink', groupId: g.groupId, weight: g.weight },
      );
    }
  }

  return rows;
}

export function isConfigActive(config: CleanupConfig): boolean {
  return !isCleared(config);
}

// Drops rows whose group can't be resolved rather than emitting a UUID that
// the grammar would later parse as a literal group name.
export function cleanupToNotes(
  cleanup: CleanupTemplate[],
  groupName: (groupId: string) => string | null,
): string {
  return cleanup
    .flatMap(row => {
      if (row.role === 'overspend') {
        const name = groupName(row.groupId);
        return name ? [`#cleanup ${name}`] : [];
      }
      let scope = '';
      if (row.groupId !== null) {
        const name = groupName(row.groupId);
        if (!name) return [];
        scope = `${name} `;
      }
      if (row.role === 'source') {
        return [`#cleanup ${scope}source`];
      }
      const weight = row.weight !== 1 ? ` ${row.weight}` : '';
      return [`#cleanup ${scope}sink${weight}`];
    })
    .join('\n');
}
