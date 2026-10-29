// Same pages, in the same order, as the mobile tab bar (minus Settings)
export const MOBILE_START_PAGE_IDS = [
  'budget',
  'transaction',
  'accounts',
  'reports',
  'schedules',
] as const;

export type MobileStartPageId = (typeof MOBILE_START_PAGE_IDS)[number];

const DEFAULT_MOBILE_START_PAGE: MobileStartPageId = 'budget';

const MOBILE_START_PAGE_PATHS = {
  budget: '/budget',
  transaction: '/transactions/new',
  accounts: '/accounts',
  reports: '/reports',
  schedules: '/schedules',
} satisfies Record<MobileStartPageId, string>;

export function parseMobileStartPage(
  raw: string | undefined,
): MobileStartPageId {
  return (
    MOBILE_START_PAGE_IDS.find(id => id === raw) ?? DEFAULT_MOBILE_START_PAGE
  );
}

export function getMobileStartPath(raw: string | undefined): string {
  return MOBILE_START_PAGE_PATHS[parseMobileStartPage(raw)];
}
