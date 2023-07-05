import React, { useState, useCallback, type Ref } from 'react';

import { usePrivacyMode } from 'loot-core/src/client/privacy';

import useFeatureFlag from '../hooks/useFeatureFlag';

type PrivacyFilterProps = {
  onActivate?: () => boolean;
  blurIntensity?: number;
  ref?: Ref<HTMLDivElement>;
};
export default function PrivacyFilter({
  onActivate,
  blurIntensity,
  ref,
  ...props
}: PrivacyFilterProps) {
  let { children } = props;
  let privacyModeFeatureFlag = useFeatureFlag('privacyMode');
  let privacyMode = usePrivacyMode();
  let activate = privacyMode && (!onActivate || (onActivate && onActivate()));

  let blurAmount = blurIntensity != null ? `${blurIntensity}px` : '3px';

  return !privacyModeFeatureFlag || !activate ? (
    children
  ) : (
    <BlurredOverlay ref={ref} blurIntensity={blurAmount} {...props}>
      {children}
    </BlurredOverlay>
  );
}

function BlurredOverlay({ ref, blurIntensity, children, ...props }) {
  let [hovered, setHovered] = useState(false);
  let onHover = useCallback(() => setHovered(true), [setHovered]);
  let onHoverEnd = useCallback(() => setHovered(false), [setHovered]);

  return (
    <div
      ref={ref}
      style={{
        ...(!hovered && {
          filter: `blur(${blurIntensity})`,
          WebkitFilter: `blur(${blurIntensity})`,
        }),
        display: 'inline-flex',
      }}
      onPointerEnter={onHover}
      onPointerLeave={onHoverEnd}
      {...props}
    >
      {children}
    </div>
  );
}
