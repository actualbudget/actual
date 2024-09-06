// @ts-strict-ignore
import React, {
  useState,
  useCallback,
  Children,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';

import { usePrivacyMode } from '../hooks/usePrivacyMode';
import { useResponsive } from '../ResponsiveProvider';

import { View } from './common/View';

type ConditionalPrivacyFilterProps = {
  children: ReactNode;
  privacyFilter?: boolean | PrivacyFilterProps;
  defaultPrivacyFilterProps?: PrivacyFilterProps;
};
export function ConditionalPrivacyFilter({
  children,
  privacyFilter,
  defaultPrivacyFilterProps,
}: ConditionalPrivacyFilterProps) {
  const renderPrivacyFilter = (children, mergedProps) => (
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
  activationFilters?: (boolean | (() => boolean))[];
  lineHeight?: number;
};
export function PrivacyFilter({
  activationFilters,
  lineHeight,
  children,
  ...props
}: PrivacyFilterProps) {
  const privacyMode = usePrivacyMode();
  // Limit mobile support for now.
  const { isNarrowWidth } = useResponsive();
  const activate =
    privacyMode &&
    !isNarrowWidth &&
    (!activationFilters ||
      activationFilters.every(value =>
        typeof value === 'boolean' ? value : value(),
      ));

  const privacyLineHeight = lineHeight != null ? lineHeight : 'inherit';

  return !activate ? (
    <>{Children.toArray(children)}</>
  ) : (
    <PrivacyOverlay lineHeight={privacyLineHeight} {...props}>
      {children}
    </PrivacyOverlay>
  );
}

function PrivacyOverlay({ lineHeight, children, ...props }) {
  const [hovered, setHovered] = useState(false);
  const onHover = useCallback(() => setHovered(true), [setHovered]);
  const onHoverEnd = useCallback(() => setHovered(false), [setHovered]);

  const privacyStyle = {
    ...(!hovered && {
      fontFamily: 'Redacted Script',
      lineHeight,
    }),
  };

  const { style, ...restProps } = props;

  return (
    <View
      style={{
        display: style?.display ? style.display : 'inline-flex',
        ...privacyStyle,
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
