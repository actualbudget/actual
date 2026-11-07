// The mobile tab bar pages (except Settings), in tab bar order. Any of them
// can be the mobile start page; the first one is the default.
export const MOBILE_TAB_PAGES = [
  { id: 'budget', path: '/budget' },
  { id: 'transaction', path: '/transactions/new' },
  { id: 'accounts', path: '/accounts' },
  { id: 'reports', path: '/reports' },
  { id: 'schedules', path: '/schedules' },
] as const;

export type MobileStartPageId = (typeof MOBILE_TAB_PAGES)[number]['id'];

function findStartPage(raw: string | undefined) {
  return MOBILE_TAB_PAGES.find(page => page.id === raw) ?? MOBILE_TAB_PAGES[0];
}

export function parseMobileStartPage(
  raw: string | undefined,
): MobileStartPageId {
  return findStartPage(raw).id;
}

export function getMobileStartPath(raw: string | undefined): string {
  return findStartPage(raw).path;
}
