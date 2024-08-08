// @ts-strict-ignore
import React, {
  useState,
  useCallback,
  Children,
  type ComponentPropsWithRef,
  type ReactNode,
  type PropsWithChildren,
  createContext,
  useContext,
  useMemo,
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

const MaskedContext = createContext<boolean>(false);

const MASK_STRING = '0123456789';

function generateMask(input: string) {
  const maskedLengthMultiplier = Math.random() * 0.6 + 0.7;
  const unboundedMaskedLength = Math.floor(
    input.length * maskedLengthMultiplier,
  );
  const maskLength = Math.min(
    Math.max(3, unboundedMaskedLength),
    MASK_STRING.length,
  );
  return MASK_STRING.slice(0, maskLength);
}

export function MaskedText({ children }: PropsWithChildren) {
  const masked = useContext(MaskedContext);
  const childString = Children.toArray(children).join('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mask = useMemo(() => generateMask(childString), [childString.length]);

  if (!masked) {
    return <>{Children.toArray(children)}</>;
  }
  return <>{mask}</>;
}

type PrivacyFilterProps = ComponentPropsWithRef<typeof View> & {
  activationFilters?: (boolean | (() => boolean))[];
  blurIntensity?: number;
};
export function PrivacyFilter({
  activationFilters,
  blurIntensity,
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

  const blurAmount = blurIntensity != null ? `${blurIntensity}px` : '3px';

  return (
    <BlurredOverlay activate={activate} blurIntensity={blurAmount} {...props}>
      {children}
    </BlurredOverlay>
  );
}

function BlurredOverlay({ activate, blurIntensity, children, ...props }) {
  const [hovered, setHovered] = useState(false);
  const onHover = useCallback(() => setHovered(true), [setHovered]);
  const onHoverEnd = useCallback(() => setHovered(false), [setHovered]);

  if (!activate) {
    return (
      <MaskedContext.Provider value={false}>{children}</MaskedContext.Provider>
    );
  }

  const blurStyle = {
    ...(!hovered && {
      filter: `blur(${blurIntensity})`,
      WebkitFilter: `blur(${blurIntensity})`,
      // To fix blur performance issue in Safari.
      // https://graffino.com/til/CjT2jrcLHP-how-to-fix-filter-blur-performance-issue-in-safari
      transform: `translate3d(0, 0, 0)`,
    }),
  };

  const { style, ...restProps } = props;

  return (
    <MaskedContext.Provider value={!hovered}>
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
    </MaskedContext.Provider>
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
