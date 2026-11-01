export type CommandBarRecentRef =
  | Readonly<{
      type: 'navigation';
      id: CommandBarRecentNavigationId;
    }>
  | Readonly<{
      type: 'account';
      id: string;
    }>
  | Readonly<{
      type: 'dashboard';
      id: string;
    }>
  | Readonly<{
      type: 'report';
      id: string;
    }>;

export type CommandBarRecentNavigationId =
  | 'budget'
  | 'reports-nav'
  | 'schedules'
  | 'payees'
  | 'rules'
  | 'tags'
  | 'bank-sync'
  | 'settings'
  | 'accounts';

type RecentCatalog = Readonly<{
  navigationItems: readonly Readonly<{
    id: CommandBarRecentNavigationId;
    path: string;
  }>[];
  accounts: readonly Readonly<{ id: string; tombstone?: boolean | number }>[];
  dashboardPages: readonly Readonly<{
    id: string;
    tombstone?: boolean | number;
  }>[];
  customReports: readonly Readonly<{
    id: string;
    tombstone?: boolean | number;
  }>[];
}>;

const fallbackNavigationRoutes: readonly Readonly<{
  id: CommandBarRecentNavigationId;
  path: string;
}>[] = [
  { id: 'budget', path: '/budget' },
  { id: 'reports-nav', path: '/reports' },
  { id: 'schedules', path: '/schedules' },
  { id: 'payees', path: '/payees' },
  { id: 'rules', path: '/rules' },
  { id: 'tags', path: '/tags' },
  { id: 'settings', path: '/settings' },
  { id: 'accounts', path: '/accounts' },
];

export function getCommandBarRecentRef(
  pathname: string,
  catalog: RecentCatalog,
): CommandBarRecentRef | null {
  const configuredNavigation = catalog.navigationItems.find(
    route => route.path === pathname,
  );
  if (configuredNavigation) {
    return { type: 'navigation', id: configuredNavigation.id };
  }
  if (catalog.navigationItems.length === 0) {
    const fallbackNavigation = fallbackNavigationRoutes.find(
      route => route.path === pathname,
    );
    if (fallbackNavigation) {
      return { type: 'navigation', id: fallbackNavigation.id };
    }
  }

  const accountId = getPathSegment(pathname, '/accounts/');
  if (accountId) {
    if (
      accountId === 'onbudget' ||
      accountId === 'offbudget' ||
      catalog.accounts.some(
        account => account.id === accountId && isAvailable(account),
      )
    ) {
      return { type: 'account', id: accountId };
    }
    return null;
  }

  const customReportId = getPathSegment(pathname, '/reports/custom/');
  if (customReportId) {
    return catalog.customReports.some(
      report => report.id === customReportId && isAvailable(report),
    )
      ? { type: 'report', id: customReportId }
      : null;
  }

  const dashboardId = getPathSegment(pathname, '/reports/');
  if (dashboardId) {
    return catalog.dashboardPages.some(
      page => page.id === dashboardId && isAvailable(page),
    )
      ? { type: 'dashboard', id: dashboardId }
      : null;
  }

  return null;
}

export function commandBarRecentRefKey(ref: CommandBarRecentRef): string {
  return `${ref.type}:${ref.id}`;
}

export function commandBarRecentPath(
  ref: CommandBarRecentRef,
  navigationItems: readonly Readonly<{
    id: CommandBarRecentNavigationId;
    path: string;
  }>[] = fallbackNavigationRoutes,
): string {
  if (ref.type === 'navigation') {
    return (
      navigationItems.find(route => route.id === ref.id)?.path ?? '/budget'
    );
  }
  if (ref.type === 'account') return `/accounts/${ref.id}`;
  if (ref.type === 'dashboard') return `/reports/${ref.id}`;
  return `/reports/custom/${ref.id}`;
}

function getPathSegment(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const segment = pathname.slice(prefix.length);
  if (segment.length === 0 || segment.includes('/')) return null;
  return segment;
}

function isAvailable(entity: { tombstone?: boolean | number }) {
  return entity.tombstone !== true && entity.tombstone !== 1;
}
