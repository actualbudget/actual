import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';

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

// On mobile we want the page header to stay mounted while navigating between
// pages so only its content (title/buttons) and not the whole element
// (including its background) is swapped out. Pages publish their header through
// this context to a single persistent `<MobilePageHeaderSlot />` rendered by the
// app shell. When there is no provider (e.g. in tests or storybook) pages fall
// back to rendering the header inline.
type RegisterMobilePageHeader = (header: ReactNode) => void;

const MobilePageHeaderRegisterContext =
  createContext<RegisterMobilePageHeader | null>(null);
const MobilePageHeaderContentContext = createContext<ReactNode>(null);

export function MobilePageHeaderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [header, setHeader] = useState<ReactNode>(null);
  return (
    <MobilePageHeaderRegisterContext.Provider value={setHeader}>
      <MobilePageHeaderContentContext.Provider value={header}>
        {children}
      </MobilePageHeaderContentContext.Provider>
    </MobilePageHeaderRegisterContext.Provider>
  );
}

type MobilePageHeaderSlotProps = {
  style?: CSSProperties;
};

export function MobilePageHeaderSlot({ style }: MobilePageHeaderSlotProps) {
  const header = useContext(MobilePageHeaderContentContext);
  return (
    <View
      style={{
        flexShrink: 0,
        minHeight: HEADER_HEIGHT,
        backgroundColor: theme.mobileHeaderBackground,
        ...style,
      }}
    >
      {header}
    </View>
  );
}

function MobilePageHeaderOutlet({ children }: { children: ReactNode }) {
  const registerHeader = useContext(MobilePageHeaderRegisterContext);

  useLayoutEffect(() => {
    if (!registerHeader) {
      return;
    }
    registerHeader(children);
    return () => registerHeader(null);
  }, [children, registerHeader]);

  return registerHeader ? null : children;
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
        <MobilePageHeaderOutlet>{headerToRender}</MobilePageHeaderOutlet>
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
