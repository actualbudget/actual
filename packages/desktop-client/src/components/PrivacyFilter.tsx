import React, {
  useState,
  useCallback,
  Children,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';

import usePrivacyMode from 'loot-core/src/client/privacy';

import useFeatureFlag from '../hooks/useFeatureFlag';
import { useResponsive } from '../ResponsiveProvider';

import View from './common/View';

export type ConditionalPrivacyFilterProps = {
  children: ReactNode;
  privacyFilter?: boolean | PrivacyFilterProps;
  defaultPrivacyFilterProps?: PrivacyFilterProps;
};
export function ConditionalPrivacyFilter({
  children,
  privacyFilter,
  defaultPrivacyFilterProps,
}: ConditionalPrivacyFilterProps) {
  let renderPrivacyFilter = (children, mergedProps) => (
    <PrivacyFilter {...mergedProps}>{children}</PrivacyFilter>
  );
  return privacyFilter ? (
    typeof privacyFilter === 'boolean' ? (
      <PrivacyFilter {...defaultPrivacyFilterProps}>{children}</PrivacyFilter>
    ) : (
      renderPrivacyFilter(
        children,
        mergeConditionalPrivacyFilterProps(
          defaultPrivacyFilterProps,
          privacyFilter,
        ),
      )
    )
  ) : (
    <>{Children.toArray(children)}</>
  );
}

type PrivacyFilterProps = ComponentPropsWithRef<typeof View> & {
  activationFilters?: boolean[] | (() => boolean)[];
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
  // Limit mobile support for now.
  let { isNarrowWidth } = useResponsive();
  let activate =
    privacyMode &&
    !isNarrowWidth &&
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
export function mergeConditionalPrivacyFilterProps(
  defaultPrivacyFilterProps: PrivacyFilterProps = {},
  privacyFilter: ConditionalPrivacyFilterProps['privacyFilter'],
): ConditionalPrivacyFilterProps['privacyFilter'] {
  if (privacyFilter == null || privacyFilter === false) {
    return privacyFilter;
  }

  if (privacyFilter === true) {
    return defaultPrivacyFilterProps;
  }

  return merge(defaultPrivacyFilterProps, privacyFilter);
}

function merge(initialValue, ...objects) {
  return objects.reduce((prev, current) => {
    Object.keys(current).forEach(key => {
      const pValue = prev[key];
      const cValue = current[key];

      if (Array.isArray(pValue) && Array.isArray(cValue)) {
        prev[key] = pValue.concat(...cValue);
      } else if (isObject(pValue) && isObject(cValue)) {
        prev[key] = merge(pValue, cValue);
      } else {
        prev[key] = cValue;
      }
    });
    return prev;
  }, initialValue);
}

function isObject(obj) {
  return obj && typeof obj === 'object';
}
