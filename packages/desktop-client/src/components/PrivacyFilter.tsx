import React, {
  useState,
  useCallback,
  Children,
  type ComponentPropsWithRef,
} from 'react';

import { usePrivacyMode } from 'loot-core/src/client/privacy';

import useFeatureFlag from '../hooks/useFeatureFlag';

import { View } from './common';

export type PrivacyFilterProps = ComponentPropsWithRef<typeof View> & {
  onActivate?: () => boolean;
  blurIntensity?: number;
};
export default function PrivacyFilter({
  onActivate,
  blurIntensity,
  children,
  ...props
}: PrivacyFilterProps) {
  let privacyModeFeatureFlag = useFeatureFlag('privacyMode');
  let privacyMode = usePrivacyMode();
  let activate = privacyMode && (!onActivate || (onActivate && onActivate()));

  let blurAmount = blurIntensity != null ? `${blurIntensity}px` : '3px';

  return !privacyModeFeatureFlag || !activate ? (
    <>{Children.toArray(children)}</>
  ) : (
    <BlurredOverlay blurIntensity={blurAmount} {...props}>
      {children}
    </BlurredOverlay>
  );
}

function BlurredOverlay({ blurIntensity, children, ...props }) {
  let [hovered, setHovered] = useState(false);
  let onHover = useCallback(() => setHovered(true), [setHovered]);
  let onHoverEnd = useCallback(() => setHovered(false), [setHovered]);

  let blurStyle = {
    ...(!hovered && {
      filter: `blur(${blurIntensity})`,
      WebkitFilter: `blur(${blurIntensity})`,
    }),
  };

  let { style, ...restProps } = props;

  return (
    <View
      style={{
        display: 'inline-flex',
        ...blurStyle,
        ...style,
      }}
      onPointerEnter={onHover}
      onPointerLeave={onHoverEnd}
      {...restProps}
    >
      {children}
    </View>
  );
}
