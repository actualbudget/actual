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

export function isCleanupConfigured(config: CleanupConfig): boolean {
  return (
    config.global.send ||
    config.global.take ||
    config.groups.some(group => group.send || group.take)
  );
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

export function cleanupDefToEditor(cleanup: CleanupTemplate[]): CleanupConfig {
  const config = emptyCleanupConfig();
  const groupScopes = new Map<string, GroupCleanup>();

  for (const row of cleanup) {
    if (row.role === 'source') {
      if (row.groupId === null) {
        config.global.send = true;
      } else {
        const group = ensureGroup(groupScopes, row.groupId);
        group.send = true;
      }
    } else if (row.role === 'sink') {
      if (row.groupId === null) {
        config.global.take = true;
        config.global.weight = row.weight;
      } else {
        const group = ensureGroup(groupScopes, row.groupId);
        group.take = true;
        group.weight = row.weight;
        // a sink wins over a stray prior overspend row for the same group
        group.overspendOnly = false;
      }
    } else {
      const group = ensureGroup(groupScopes, row.groupId);
      // don't downgrade a real sink row already recorded for this group
      if (!group.take) {
        group.take = true;
        group.overspendOnly = true;
      }
    }
  }

  config.groups = Array.from(groupScopes.values());
  return config;
}

export function editorToCleanupDef(config: CleanupConfig): CleanupTemplate[] {
  if (!isCleanupConfigured(config)) return [];

  const rows: CleanupTemplate[] = [];

  if (config.global.send) rows.push({ role: 'source', groupId: null });
  if (config.global.take) {
    rows.push({ role: 'sink', groupId: null, weight: config.global.weight });
  }

  for (const group of config.groups) {
    if (group.send) rows.push({ role: 'source', groupId: group.groupId });
    if (group.take) {
      rows.push(
        group.overspendOnly
          ? { role: 'overspend', groupId: group.groupId }
          : { role: 'sink', groupId: group.groupId, weight: group.weight },
      );
    }
  }

  return rows;
}

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
