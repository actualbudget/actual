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

export const COMMAND_BAR_FAVORITES_VERSION = 1 as const;

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
  return (
    isRecord(value) &&
    (value.type === 'account' || value.type === 'report') &&
    typeof value.id === 'string' &&
    value.id.length > 0
  );
}

export function favoriteRefKey(ref: CommandBarFavoriteRef): string {
  return `${ref.type}:${ref.id}`;
}

export function parseCommandBarFavorites(
  value: unknown,
): CommandBarFavoriteRef[] {
  if (
    !isRecord(value) ||
    value.version !== COMMAND_BAR_FAVORITES_VERSION ||
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
    favorites.push({ type: candidate.type, id: candidate.id });
  }
  return favorites;
}

export function serializeCommandBarFavorites(
  favorites: readonly CommandBarFavoriteRef[],
): CommandBarFavoritesPref {
  return {
    version: COMMAND_BAR_FAVORITES_VERSION,
    favorites: favorites.map(({ type, id }) => ({ type, id })),
  };
}

/**
 * Apply an explicit favorite toggle. Stale entries are intentionally removed
 * here, rather than while resolving/rendering, so reads remain side-effect
 * free.
 */
export function updateCommandBarFavorites(
  stored: unknown,
  eligible: readonly CommandBarFavoriteRef[],
  toggled: CommandBarFavoriteRef,
): CommandBarFavoritesPref {
  const eligibleKeys = new Set(eligible.map(favoriteRefKey));
  const current = parseCommandBarFavorites(stored).filter(ref =>
    eligibleKeys.has(favoriteRefKey(ref)),
  );
  const toggledKey = favoriteRefKey(toggled);

  if (!eligibleKeys.has(toggledKey)) {
    return serializeCommandBarFavorites(current);
  }

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

    const report = reportById.get(favorite.id);
    return report ? [{ ref: favorite, item: report }] : [];
  });
}
