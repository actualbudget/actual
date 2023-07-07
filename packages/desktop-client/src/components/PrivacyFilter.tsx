import React, {
  useState,
  useCallback,
  Children,
  type ComponentPropsWithRef,
  type ReactNode,
  type ReactElement,
} from 'react';

import { usePrivacyMode } from 'loot-core/src/client/privacy';

import useFeatureFlag from '../hooks/useFeatureFlag';

import { View } from './common';

export type ConditionalPrivacyFilterProps = {
  children: ReactNode;
  privacyFilter?:
    | boolean
    | ((
        render?: (
          props?: PrivacyFilterProps,
        ) =>
          | ReactElement<PrivacyFilterProps, typeof PrivacyFilter>
          | ReactElement,
        defaultProps?: PrivacyFilterProps,
      ) =>
        | ReactElement<PrivacyFilterProps, typeof PrivacyFilter>
        | ReactElement);
  privacyFilterProps?: PrivacyFilterProps;
};
export function ConditionalPrivacyFilter({
  children,
  privacyFilter,
  privacyFilterProps,
}: ConditionalPrivacyFilterProps) {
  let renderPrivacyFilter = updatedProps => (
    <PrivacyFilter {...updatedProps}>{children}</PrivacyFilter>
  );
  return privacyFilter ? (
    typeof privacyFilter === 'function' ? (
      privacyFilter(renderPrivacyFilter, privacyFilterProps)
    ) : (
      <PrivacyFilter {...privacyFilterProps}>{children}</PrivacyFilter>
    )
  ) : (
    <>{Children.toArray(children)}</>
  );
}

type PrivacyFilterProps = ComponentPropsWithRef<typeof View> & {
  activationFilters?: (boolean | (() => boolean))[];
  blurIntensity?: number;
};
export default function PrivacyFilter({
  activationFilters,
  blurIntensity,
  children,
  ...props
}: PrivacyFilterProps) {
  let privacyModeFeatureFlag = useFeatureFlag('privacyMode');
  let privacyMode = usePrivacyMode();
  let activate =
    privacyMode &&
    (!activationFilters ||
      activationFilters.every(value =>
        typeof value === 'boolean' ? value : value(),
      ));

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
        display: style?.display ? style.display : 'inline-flex',
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
