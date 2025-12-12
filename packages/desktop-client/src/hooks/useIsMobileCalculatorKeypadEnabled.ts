import { useEffect, useState } from 'react';

import { breakpoints } from '@actual-app/components/tokens';

function useMatchMedia(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
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
  }, [query]);

  return matches;
}

export function useIsMobileCalculatorKeypadEnabled() {
  // Use media queries for deterministic behavior (including in Playwright).
  const isNarrowViewport = useMatchMedia(
    `(max-width: ${breakpoints.small - 1}px)`,
  );

  // Prefer capability detection over user-agent sniffing.
  // - pointer: coarse => touch-first device
  // - hover: none => no hover (typical mobile browsers)
  const isCoarsePointer = useMatchMedia('(pointer: coarse)');
  const isNoHover = useMatchMedia('(hover: none)');

  return isNarrowViewport || (isCoarsePointer && isNoHover);
}
