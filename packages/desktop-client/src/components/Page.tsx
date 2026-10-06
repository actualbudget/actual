import React, { createContext, useContext, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

const HEADER_HEIGHT = 50;

type PageHeaderProps = {
  title: ReactNode;
  style?: CSSProperties;
};

export function PageHeader({ title, style }: PageHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginLeft: 20,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          fontSize: 25,
          fontWeight: 500,
        }}
      >
        {typeof title === 'string' ? <Text>{title}</Text> : title}
      </View>
    </View>
  );
}

type MobilePageHeaderProps = {
  title: ReactNode;
  style?: CSSProperties;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
};

export function MobilePageHeader({
  title,
  style,
  leftContent,
  rightContent,
}: MobilePageHeaderProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        flexShrink: 0,
        height: HEADER_HEIGHT,
        backgroundColor: theme.mobileHeaderBackground,
        '& *': {
          color: theme.mobileHeaderText,
        },
        '& button[data-pressed]': {
          backgroundColor: theme.mobileHeaderTextHover,
        },
        ...style,
      }}
    >
      <View
        style={{
          flexBasis: '25%',
          justifyContent: 'flex-start',
          flexDirection: 'row',
        }}
      >
        {leftContent}
      </View>
      <h1
        style={{
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          flexBasis: '50%',
          fontSize: 17,
          fontWeight: 500,
          overflowY: 'auto',
          display: 'flex',
          margin: 0,
          padding: 0,
        }}
      >
        {title}
      </h1>
      <View
        style={{
          flexBasis: '25%',
          justifyContent: 'flex-end',
          flexDirection: 'row',
        }}
      >
        {rightContent}
      </View>
    </View>
  );
}

// On mobile the page header element stays mounted while navigating between
// pages so its background doesn't flash while the next page renders. Pages
// render their header into a single persistent `<MobilePageHeaderSlot />`
// (rendered by the app shell) through a portal. Without a provider (e.g. in
// tests or storybook) the header is rendered inline instead.
const MobilePageHeaderSlotContext = createContext<HTMLElement | null>(null);
const MobilePageHeaderSlotRefContext = createContext<
  ((element: HTMLElement | null) => void) | null
>(null);

export function MobilePageHeaderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <MobilePageHeaderSlotRefContext.Provider value={setSlot}>
      <MobilePageHeaderSlotContext.Provider value={slot}>
        {children}
      </MobilePageHeaderSlotContext.Provider>
    </MobilePageHeaderSlotRefContext.Provider>
  );
}

type MobilePageHeaderSlotProps = {
  style?: CSSProperties;
};

export function MobilePageHeaderSlot({ style }: MobilePageHeaderSlotProps) {
  const slotRef = useContext(MobilePageHeaderSlotRefContext);
  return (
    <View
      ref={slotRef ?? undefined}
      style={{
        flexShrink: 0,
        minHeight: HEADER_HEIGHT,
        backgroundColor: theme.mobileHeaderBackground,
        ...style,
      }}
    />
  );
}

type PageProps = {
  header: ReactNode;
  style?: CSSProperties;
  padding?: number;
  children: ReactNode;
  footer?: ReactNode;
};

export function Page({ header, style, padding, children, footer }: PageProps) {
  const { isNarrowWidth } = useResponsive();
  const mobileHeaderSlot = useContext(MobilePageHeaderSlotContext);
  const childrenPadding = padding != null ? padding : isNarrowWidth ? 10 : 20;

  const headerToRender =
    typeof header === 'string' ? (
      isNarrowWidth ? (
        <MobilePageHeader title={header} />
      ) : (
        <PageHeader title={header} />
      )
    ) : (
      header
    );

  const main = (
    <View
      role="main"
      style={{
        flex: 1,
        overflowY: isNarrowWidth ? 'auto' : undefined,
        padding: `0 ${childrenPadding}px`,
      }}
    >
      {children}
    </View>
  );

  if (isNarrowWidth) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.mobilePageBackground,
          ...style,
        }}
      >
        {mobileHeaderSlot
          ? createPortal(headerToRender, mobileHeaderSlot)
          : headerToRender}
        {main}
        {footer}
      </View>
    );
  }

  return (
    <View
      style={{
        ...styles.page,
        flex: 1,
        backgroundColor: theme.pageBackground,
        ...style,
      }}
    >
      {headerToRender}
      {main}
      {footer}
    </View>
  );
}
