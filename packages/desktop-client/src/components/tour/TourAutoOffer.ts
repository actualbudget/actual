import { useEffect, useRef } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { useOnboarding } from '#components/onboarding/OnboardingProvider';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useLocalPref } from '#hooks/useLocalPref';

/**
 * The first time a budget file is opened on a device, open the "Getting
 * started" checklist so new users immediately see what to do next. It only
 * happens once; afterwards the checklist stays available as a small launcher
 * and from the Help menu.
 */
export function TourAutoOffer() {
  const { isNarrowWidth } = useResponsive();
  const isTestEnv = useIsTestEnv();
  const { showChecklist } = useOnboarding();
  const [introSeen, setIntroSeen] = useLocalPref('tour.introSeen');
  const hasOffered = useRef(false);

  useEffect(() => {
    if (hasOffered.current || introSeen || isNarrowWidth || isTestEnv) {
      return;
    }
    hasOffered.current = true;
    showChecklist();
    setIntroSeen(true);
  }, [introSeen, isNarrowWidth, isTestEnv, setIntroSeen, showChecklist]);

  return null;
}
