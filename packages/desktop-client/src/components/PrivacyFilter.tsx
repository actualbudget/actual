// @ts-strict-ignore
import React, {
  useState,
  useCallback,
  Children,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';

import { css } from 'glamor';

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
};
export function PrivacyFilter({
  activationFilters,
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

  return !activate ? (
    <>{Children.toArray(children)}</>
  ) : (
    <PrivacyOverlay {...props}>{children}</PrivacyOverlay>
  );
}

function PrivacyOverlay({ children, ...props }) {
  const { style, ...restProps } = props;

  return (
    <View
      className={`${css(
        [
          {
            display: 'inline-flex',
            position: 'relative',
            ' > div:first-child': {
              opacity: 0,
            },
            ' > div:nth-child(2)': {
              display: 'block',
            },
            '&:hover': {
              ' > div:first-child': {
                opacity: 1,
              },
              ' > div:nth-child(2)': {
                display: 'none',
              },
            },
          },
        ],
        style,
      )}`}
      {...restProps}
    >
      <div>
        <View>{children}</View>
      </div>

      <div
        aria-hidden="true"
        className={`${css({
          fontFamily: 'Redacted Script',
          height: '100%',
          inset: 0,
          pointerEvents: 'none',
          position: 'absolute',
          width: '100%',
        })}`}
      >
        <View>{children}</View>
      </div>
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
