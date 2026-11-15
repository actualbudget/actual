import React from 'react';

import { useFeatureFlag } from '#hooks/useFeatureFlag';

import {
  LEGACY_MOBILE_NAV_HEIGHT,
  LegacyMobileNavTabs,
} from './LegacyMobileNavTabs';
import {
  SIMPLE_MOBILE_NAV_HEIGHT,
  SimpleMobileNavTabs,
} from './SimpleMobileNavTabs';

/**
 * Bottom padding that scrollable mobile pages reserve for the navbar. Uses the
 * taller legacy height so content clears either navbar variant.
 */
export const MOBILE_NAV_HEIGHT = LEGACY_MOBILE_NAV_HEIGHT;

export function MobileNavTabs() {
  const isSimpleNavbar = useFeatureFlag('simpleMobileNavbar');
  return isSimpleNavbar ? <SimpleMobileNavTabs /> : <LegacyMobileNavTabs />;
}

/**
 * Space taken at the bottom of the screen by the simple (always visible)
 * navbar, or 0 when the legacy swipeable navbar is in use.
 */
export function useFixedMobileNavHeight() {
  const isSimpleNavbar = useFeatureFlag('simpleMobileNavbar');
  return isSimpleNavbar ? SIMPLE_MOBILE_NAV_HEIGHT : 0;
}
