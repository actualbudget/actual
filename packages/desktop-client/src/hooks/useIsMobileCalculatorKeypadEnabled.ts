import { useEffect, useState } from 'react';

import { breakpoints } from '@actual-app/components/tokens';

import { useFeatureFlag } from './useFeatureFlag';

function useMatchMedia(query: string, enabled: boolean) {
  const [matches, setMatches] = useState(() => {
    if (!enabled) {
      return false;
    }

    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!enabled) {
      setMatches(false);
      return;
    }

    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia(query);

    const onChange = () => {
      setMatches(media.matches);
    };

    // Initialize immediately
    onChange();

    // Safari < 14 support
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, [enabled, query]);

  return matches;
}

export function useIsMobileCalculatorKeypadEnabled() {
  const isFeatureEnabled = useFeatureFlag('mobileCalculatorKeypad');

  // Use media queries for deterministic behavior (including in Playwright).
  const isNarrowViewport = useMatchMedia(
    `(max-width: ${breakpoints.small - 1}px)`,
    isFeatureEnabled,
  );

  // Prefer capability detection over user-agent sniffing.
  // - pointer: coarse => touch-first device
  // - hover: none => no hover (typical mobile browsers)
  const isCoarsePointer = useMatchMedia('(pointer: coarse)', isFeatureEnabled);
  const isNoHover = useMatchMedia('(hover: none)', isFeatureEnabled);

  return (
    isFeatureEnabled && (isNarrowViewport || (isCoarsePointer && isNoHover))
  );
}
