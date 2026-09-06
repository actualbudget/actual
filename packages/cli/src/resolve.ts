import * as api from '@actual-app/api';

import { isUuid } from '#utils';

type EntityType = 'accounts' | 'categories' | 'payees' | 'schedules';

/**
 * Accept either an entity ID or an exact (case-insensitive) name and return
 * the ID. Names are matched against the entity list so that hidden/closed
 * entries are still resolvable.
 */
export async function resolveId(
  type: EntityType,
  value: string,
): Promise<string> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Empty ${type.slice(0, -1)} reference`);
  }
  if (isUuid(trimmed)) return trimmed;

  const entities = await listEntities(type);
  const lowered = trimmed.toLowerCase();
  const exact = entities.filter(e => e.name.trim().toLowerCase() === lowered);
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) {
    throw new Error(
      `Ambiguous ${type.slice(0, -1)} name "${trimmed}" matches ${exact.length} entries. Use an ID instead: ${exact.map(e => e.id).join(', ')}`,
    );
  }
  const partial = entities.filter(e =>
    e.name.trim().toLowerCase().includes(lowered),
  );
  if (partial.length === 1) return partial[0].id;
  if (partial.length > 1) {
    throw new Error(
      `${type.slice(0, -1)} name "${trimmed}" is not exact and matches several: ${partial
        .map(e => e.name.trim())
        .join(', ')}`,
    );
  }
  throw new Error(`No ${type.slice(0, -1)} found matching "${trimmed}"`);
}

async function listEntities(
  type: EntityType,
): Promise<Array<{ id: string; name: string }>> {
  switch (type) {
    case 'accounts':
      return api.getAccounts();
    case 'categories':
      return api.getCategories({});
    case 'payees':
      return api.getPayees();
    case 'schedules':
      return (await api.getSchedules()).map(s => ({
        id: s.id,
        name: s.name ?? '',
      }));
    default:
      throw new Error(`Unknown entity type: ${type as string}`);
  }
}

/** Build a name lookup so report rows can show names next to IDs. */
export function indexByName<T extends { id: string; name: string }>(
  items: T[],
): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}
