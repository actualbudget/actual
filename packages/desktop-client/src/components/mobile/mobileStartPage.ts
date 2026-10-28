export const MOBILE_START_PAGE_IDS = ['budget', 'accounts', 'reports'] as const;

export type MobileStartPageId = (typeof MOBILE_START_PAGE_IDS)[number];

const DEFAULT_MOBILE_START_PAGE: MobileStartPageId = 'budget';

export function parseMobileStartPage(
  raw: string | undefined,
): MobileStartPageId {
  return (
    MOBILE_START_PAGE_IDS.find(id => id === raw) ?? DEFAULT_MOBILE_START_PAGE
  );
}

export function getMobileStartPath(raw: string | undefined): string {
  return `/${parseMobileStartPage(raw)}`;
}
