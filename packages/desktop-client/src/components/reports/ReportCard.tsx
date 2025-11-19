import React, {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';

import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useIsInViewport } from '@desktop-client/hooks/useIsInViewport';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

type ReportCardProps = {
  isEditing?: boolean;
  disableClick?: boolean;
  to?: string;
  children: ReactNode;
  menuItems?: ComponentProps<typeof Menu>['items'];
  onMenuSelect?: ComponentProps<typeof Menu>['onMenuSelect'];
  size?: number;
  style?: CSSProperties;
};

export function ReportCard({
  isEditing,
  disableClick,
  to,
  menuItems,
  onMenuSelect,
  children,
  size = 1,
  style,
}: ReportCardProps) {
  const ref = useRef(null);
  const isInViewport = useIsInViewport(ref);
  const [hasRendered, setHasRendered] = useState(false);
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const containerProps = {
    flex: isNarrowWidth ? '1 1' : `0 0 calc(${size * 100}% / 3 - 20px)`,
  };

  useEffect(() => {
    if (isInViewport && !hasRendered) {
      setHasRendered(true);
    }
  }, [isInViewport, hasRendered]);

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
        ...(isEditing
          ? {
              '& .recharts-surface:hover': {
                cursor: 'move',
                ':active': { cursor: 'grabbing' },
              },
              ':active': { cursor: 'grabbing' },
              filter: 'grayscale(1)',
            }
          : {
              '& .recharts-surface:hover': {
                cursor: 'pointer',
              },
            }),
        ':hover': {
          ...(to ? { boxShadow: '0 4px 6px rgba(0, 0, 0, .15)' } : null),
          ...(isEditing ? { cursor: 'move', filter: 'grayscale(0)' } : null),
        },
        ...(to ? null : containerProps),
        ...style,
      }}
    >
      {/* we render the content only if it is in the viewport
      this reduces the amount of concurrent server api calls and thus
      has a better performance */}
      {isInViewport || hasRendered ? children : null}
    </View>
  );

  if (to) {
    return (
      <Layout {...layoutProps}>
        <View
          role="button"
          onClick={isEditing || disableClick ? undefined : () => navigate(to)}
          style={{
            height: '100%',
            width: '100%',
            ':hover': {
              cursor: 'pointer',
            },
          }}
        >
          {content}
        </View>
      </Layout>
    );
  }

  return <Layout {...layoutProps}>{content}</Layout>;
}

type LayoutProps = {
  children: ReactNode;
} & Pick<ReportCardProps, 'isEditing' | 'menuItems' | 'onMenuSelect'>;

function Layout({ children, isEditing, menuItems, onMenuSelect }: LayoutProps) {
  const { t } = useTranslation();

  const triggerRef = useRef(null);
  const viewRef = useRef(null);

  const {
    setMenuOpen,
    menuOpen,
    handleContextMenu,
    resetPosition,
    position,
    asContextMenu,
  } = useContextMenu();

  return (
    <View
      ref={viewRef}
      onContextMenu={handleContextMenu}
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
      {menuItems && (
        <>
          {isEditing && (
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
              <Button
                ref={triggerRef}
                variant="bare"
                aria-label={t('Menu')}
                onPress={() => {
                  resetPosition();
                  setMenuOpen(true);
                }}
              >
                <SvgDotsHorizontalTriple
                  width={15}
                  height={15}
                  style={{ transform: 'rotateZ(90deg)' }}
                />
              </Button>
            </View>
          )}

          <Popover
            triggerRef={asContextMenu ? viewRef : triggerRef}
            isOpen={Boolean(menuOpen)}
            onOpenChange={() => setMenuOpen(false)}
            isNonModal
            placement={asContextMenu ? 'bottom start' : 'bottom end'}
            {...position}
          >
            <Menu
              className={NON_DRAGGABLE_AREA_CLASS_NAME}
              onMenuSelect={onMenuSelect}
              items={menuItems}
            />
          </Popover>
        </>
      )}

      {children}
    </View>
  );
}
