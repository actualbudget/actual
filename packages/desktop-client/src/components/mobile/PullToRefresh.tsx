import React, { useEffect, useRef } from 'react';
import type { ComponentProps, RefObject } from 'react';
import BasePullToRefresh from 'react-simple-pull-to-refresh';

import type { CSSProperties } from '@actual-app/components/styles';
import { css } from '@emotion/css';

import { hapticThresholdCrossed } from '#util/haptics';

type PullToRefreshProps = ComponentProps<typeof BasePullToRefresh> & {
  style?: CSSProperties;
};

export function PullToRefresh(props: PullToRefreshProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  usePullThresholdHaptic(wrapperRef);

  return (
    <div ref={wrapperRef} style={{ overflow: 'auto', flex: 1 }}>
      <BasePullToRefresh
        pullDownThreshold={80}
        resistance={2}
        className={css({
          '& .ptr__pull-down': {
            textAlign: 'center',
          },
          '& .ptr__children': {
            overflow: 'hidden auto',
          },
          ...(props.style || {}),
        })}
        {...props}
        // Force async because the library errors out when a sync onRefresh method is provided.
        onRefresh={async () => {
          await props.onRefresh?.();
        }}
      />
    </div>
  );
}

// Set by the library on its container while the pull is past the point at
// which letting go triggers a refresh.
const THRESHOLD_BREACHED_CLASS = 'ptr--pull-down-treshold-breached';

/**
 * Gives haptic feedback the moment a pull arms the refresh, like native
 * pull-to-refresh does. The library signals the threshold only through a
 * class on its container (the wrapper's first child), so that class is
 * watched.
 */
function usePullThresholdHaptic(wrapperRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = wrapperRef.current?.firstElementChild;
    if (!container) {
      return;
    }

    let wasPastThreshold = container.classList.contains(
      THRESHOLD_BREACHED_CLASS,
    );
    const observer = new MutationObserver(() => {
      const isPastThreshold = container.classList.contains(
        THRESHOLD_BREACHED_CLASS,
      );
      if (isPastThreshold && !wasPastThreshold) {
        hapticThresholdCrossed();
      }
      wasPastThreshold = isPastThreshold;
    });
    observer.observe(container, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [wrapperRef]);
}
