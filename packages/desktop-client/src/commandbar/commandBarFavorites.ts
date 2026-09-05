import type {
  AccountEntity,
  CustomReportEntity,
} from '@actual-app/core/types/models';
import type {
  CommandBarFavoriteRef,
  CommandBarFavoritesPref,
} from '@actual-app/core/types/prefs';

export type {
  CommandBarFavoriteRef,
  CommandBarFavoritesPref,
} from '@actual-app/core/types/prefs';

export const COMMAND_BAR_FAVORITES_VERSION = 2 as const;
const LEGACY_COMMAND_BAR_FAVORITES_VERSION = 1;

export type ResolvedCommandBarFavorite =
  | {
      ref: Extract<CommandBarFavoriteRef, { type: 'account' }>;
      item: AccountEntity;
    }
  | {
      ref: Extract<CommandBarFavoriteRef, { type: 'report' }>;
      item: CustomReportEntity;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFavoriteRef(value: unknown): value is CommandBarFavoriteRef {
  if (!isRecord(value)) return false;
  if (
    (value.type === 'navigation' ||
      value.type === 'account' ||
      value.type === 'dashboard' ||
      value.type === 'report' ||
      value.type === 'quick-action') &&
    typeof value.id === 'string'
  ) {
    return value.id.length > 0;
  }
  return (
    value.type === 'page-action' &&
    typeof value.ownerId === 'string' &&
    value.ownerId.length > 0 &&
    typeof value.commandId === 'string' &&
    value.commandId.length > 0 &&
    (value.instanceId === undefined ||
      (typeof value.instanceId === 'string' && value.instanceId.length > 0))
  );
}

export function favoriteRefKey(ref: CommandBarFavoriteRef): string {
  return ref.type === 'page-action'
    ? getCommandBaseId(ref.ownerId, ref.commandId, ref.instanceId)
    : `${ref.type}:${ref.id}`;
}

function getCommandBaseId(
  ownerId: string,
  commandId: string,
  instanceId?: string,
) {
  return instanceId == null
    ? `command:${ownerId.length}:${ownerId}:${commandId.length}:${commandId}`
    : `command:${ownerId.length}:${ownerId}:${commandId.length}:${commandId}:${instanceId.length}:${instanceId}`;
}

export function parseCommandBarFavorites(
  value: unknown,
): CommandBarFavoriteRef[] {
  if (
    !isRecord(value) ||
    (value.version !== COMMAND_BAR_FAVORITES_VERSION &&
      value.version !== LEGACY_COMMAND_BAR_FAVORITES_VERSION) ||
    !Array.isArray(value.favorites)
  ) {
    return [];
  }

  const seen = new Set<string>();
  const favorites: CommandBarFavoriteRef[] = [];
  for (const candidate of value.favorites) {
    if (!isFavoriteRef(candidate)) continue;
    const key = favoriteRefKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    favorites.push(
      candidate.type === 'page-action'
        ? {
            type: candidate.type,
            ownerId: candidate.ownerId,
            commandId: candidate.commandId,
            ...(candidate.instanceId != null
              ? { instanceId: candidate.instanceId }
              : {}),
          }
        : { type: candidate.type, id: candidate.id },
    );
  }
  return favorites;
}

export function serializeCommandBarFavorites(
  favorites: readonly CommandBarFavoriteRef[],
): CommandBarFavoritesPref {
  return {
    version: COMMAND_BAR_FAVORITES_VERSION,
    favorites: favorites.map(favorite =>
      favorite.type === 'page-action'
        ? {
            type: favorite.type,
            ownerId: favorite.ownerId,
            commandId: favorite.commandId,
            ...(favorite.instanceId != null
              ? { instanceId: favorite.instanceId }
              : {}),
          }
        : { type: favorite.type, id: favorite.id },
    ),
  };
}

/**
 * Apply an explicit favorite toggle. Stale entries remain untouched until
 * explicitly removed, so reads and routine toggles are side-effect free.
 */
export function updateCommandBarFavorites(
  stored: unknown,
  _eligible: readonly CommandBarFavoriteRef[],
  toggled: CommandBarFavoriteRef,
): CommandBarFavoritesPref {
  // Unmounted/deleted entries are deliberately retained. They may become
  // resolvable again, and routine toggles must never silently reorder/prune.
  const current = parseCommandBarFavorites(stored);
  const toggledKey = favoriteRefKey(toggled);

  return serializeCommandBarFavorites(
    current.some(ref => favoriteRefKey(ref) === toggledKey)
      ? current.filter(ref => favoriteRefKey(ref) !== toggledKey)
      : [...current, toggled],
  );
}

export function resolveCommandBarFavorites(
  favorites: readonly CommandBarFavoriteRef[],
  accounts: readonly AccountEntity[],
  reports: readonly CustomReportEntity[],
): ResolvedCommandBarFavorite[] {
  const accountById = new Map(accounts.map(account => [account.id, account]));
  const reportById = new Map(reports.map(report => [report.id, report]));

  return favorites.flatMap((favorite): ResolvedCommandBarFavorite[] => {
    if (favorite.type === 'account') {
      const account = accountById.get(favorite.id);
      return account ? [{ ref: favorite, item: account }] : [];
    }

    if (favorite.type !== 'report') return [];
    const report = reportById.get(favorite.id);
    return report ? [{ ref: favorite, item: report }] : [];
  });
}
