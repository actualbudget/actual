import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useContextMenu } from '#hooks/useContextMenu';
import { useIsInViewport } from '#hooks/useIsInViewport';
import { useNavigate } from '#hooks/useNavigate';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import {
  useCopyDashboardWidgetMutation,
  useRemoveDashboardWidgetMutation,
} from '#reports/mutations';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';

type ReportCardProps = {
  widgetId: string;
  isEditing?: boolean;
  disableClick?: boolean;
  to?: string;
  children: ReactNode;
  size?: number;
  style?: CSSProperties;
  onRename?: () => void;
  contextMenuTriggerRef?: RefObject<HTMLDivElement | null>;
};

export function ReportCard({
  widgetId,
  isEditing,
  disableClick,
  to,
  children,
  size = 1,
  style,
  onRename,
  contextMenuTriggerRef,
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
    widgetId,
    onRename,
    contextMenuTriggerRef,
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

  if (to && !isEditing && !disableClick) {
    return (
      <Layout {...layoutProps}>
        <Button
          variant="bare"
          onPress={() => navigate(to, { state: { goBack: true } })}
          style={{
            height: '100%',
            width: '100%',
            background: 'transparent',
            padding: 0,
            textAlign: 'left',
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
} & Pick<
  ReportCardProps,
  'isEditing' | 'widgetId' | 'onRename' | 'contextMenuTriggerRef'
>;

function Layout({
  children,
  isEditing,
  widgetId,
  onRename,
  contextMenuTriggerRef,
}: LayoutProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const internalViewRef = useRef<HTMLDivElement>(null);
  const viewRef = contextMenuTriggerRef || internalViewRef;

  const removeDashboardWidgetMutation = useRemoveDashboardWidgetMutation();
  const copyDashboardWidgetMutation = useCopyDashboardWidgetMutation();

  useContextMenu({
    triggerRef: viewRef,
    items: [
      onRename && {
        name: 'rename',
        text: t('Rename'),
        onClick: onRename,
        order: 1,
      },
      {
        name: 'remove',
        text: t('Remove'),
        onClick: () => removeDashboardWidgetMutation.mutate({ id: widgetId }),
        order: 1,
      },
      {
        name: 'copy',
        text: t('Copy to dashboard'),
        onClick: () => {
          dispatch(
            pushModal({
              modal: {
                name: 'copy-widget-to-dashboard',
                options: {
                  onSelect: targetDashboardId => {
                    copyDashboardWidgetMutation.mutate({
                      id: widgetId,
                      targetDashboardPageId: targetDashboardId,
                    });
                  },
                },
              },
            }),
          );
        },
        order: 1,
      },
    ],
  });

  return (
    <View
      ref={viewRef}
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
      {isEditing && (
        <View
          className={['hover-visible', NON_DRAGGABLE_AREA_CLASS_NAME].join(' ')}
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
              if (viewRef.current) {
                const rect = triggerRef.current?.getBoundingClientRect();
                const clientX = rect ? rect.left : 0;
                const clientY = rect ? rect.bottom : 0;
                viewRef.current.dispatchEvent(
                  new MouseEvent('contextmenu', {
                    bubbles: true,
                    clientX,
                    clientY,
                  }),
                );
              }
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

      {children}
    </View>
  );
}
