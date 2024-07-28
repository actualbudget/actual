import React, {
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

import { type CustomReportEntity } from 'loot-core/src/types/models';

import { useIsInViewport } from '../../hooks/useIsInViewport';
import { useNavigate } from '../../hooks/useNavigate';
import { useResponsive } from '../../ResponsiveProvider';
import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { MenuButton } from '../common/MenuButton';
import { Popover } from '../common/Popover';
import { View } from '../common/View';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';

type ReportCardProps = {
  isEditing?: boolean;
  to?: string;
  children: ReactNode;
  report?: CustomReportEntity;
  menuItems?: ComponentProps<typeof Menu>['items'];
  onMenuSelect?: ComponentProps<typeof Menu>['onMenuSelect'];
  size?: number;
  style?: CSSProperties;
};

export function ReportCard({
  isEditing,
  to,
  report,
  menuItems,
  onMenuSelect,
  children,
  size = 1,
  style,
}: ReportCardProps) {
  const ref = useRef(null);
  const isInViewport = useIsInViewport(ref);
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const containerProps = {
    flex: isNarrowWidth ? '1 1' : `0 0 calc(${size * 100}% / 3 - 20px)`,
  };

  const layoutProps = {
    isEditing,
    menuItems,
    onMenuSelect,
  };

  const content = (
    <View
      ref={ref}
      style={{
        backgroundColor: theme.tableBackground,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
        width: '100%',
        height: '100%',
        boxShadow: '0 2px 6px rgba(0, 0, 0, .15)',
        transition: 'box-shadow .25s',
        '& .recharts-surface:hover': {
          cursor: 'pointer',
        },
        ':hover': {
          ...(to ? { boxShadow: '0 4px 6px rgba(0, 0, 0, .15)' } : null),
          ...(isEditing ? { cursor: 'pointer' } : null),
        },
        ...(to ? null : containerProps),
        ...style,
      }}
    >
      {/* we render the content only if it is in the viewport
      this reduces the amount of concurrent server api calls and thus
      has a better performance */}
      {isInViewport ? children : null}
    </View>
  );

  if (to) {
    return (
      <Layout {...layoutProps}>
        <Button
          variant="bare"
          onPress={
            isEditing
              ? undefined
              : () => {
                  navigate(to, { state: { report } });
                }
          }
          style={{
            padding: 0,
            textAlign: 'left',
            height: '100%',
            width: '100%',
            overflow: 'visible',
          }}
        >
          {content}
        </Button>
      </Layout>
    );
  }

  return <Layout {...layoutProps}>{content}</Layout>;
}

type LayoutProps = {
  children: ReactNode;
} & Pick<ReportCardProps, 'isEditing' | 'menuItems' | 'onMenuSelect'>;

function Layout({ children, isEditing, menuItems, onMenuSelect }: LayoutProps) {
  const triggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View
      style={{
        display: 'block',
        height: '100%',
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      {menuItems && isEditing && (
        <View
          className={[
            menuOpen ? undefined : 'hover-visible',
            NON_DRAGGABLE_AREA_CLASS_NAME,
          ].join(' ')}
          style={{
            position: 'absolute',
            top: 7,
            right: 3,
            zIndex: 1,
          }}
        >
          <MenuButton ref={triggerRef} onClick={() => setMenuOpen(true)} />
          <Popover
            triggerRef={triggerRef}
            isOpen={menuOpen}
            onOpenChange={() => setMenuOpen(false)}
          >
            <Menu
              className={NON_DRAGGABLE_AREA_CLASS_NAME}
              onMenuSelect={onMenuSelect}
              items={menuItems}
            />
          </Popover>
        </View>
      )}

      {children}
    </View>
  );
}
