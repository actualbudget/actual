import React, { useState, type ReactNode, useCallback } from 'react';

import { usePrivacyMode } from 'loot-core/src/client/data-hooks/privacy';

type PrivacyFilterProps = {
  blurIntensity?: number;
  children?: ReactNode;
};
export default function PrivacyFilter({
  blurIntensity,
  children,
}: PrivacyFilterProps) {
  let [hovered, setHovered] = useState(false);
  let onHover = useCallback(() => setHovered(true), [setHovered]);
  let onHoverEnd = useCallback(() => setHovered(false), [setHovered]);

  let blurAmount = blurIntensity != null ? `${blurIntensity}px` : '3px';
  let privacyMode = usePrivacyMode();

  return !privacyMode ? (
    children
  ) : (
    <div
      style={{
        ...(!hovered && { filter: `blur${blurAmount}` }),
        ...(!hovered && { WebkitFilter: `blur(${blurAmount})` }),
      }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onTouchStart={onHover}
      onTouchEnd={onHoverEnd}
    >
      {children}
    </div>
  );
}
