// @ts-strict-ignore
import React, {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type CSSProperties,
  type SetStateAction,
} from 'react';
import { useTranslation } from 'react-i18next';
import { animated, to, useSpring } from 'react-spring';
import { useSwipeable } from 'react-swipeable';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { Link } from './common/Link';
import { MODAL_Z_INDEX } from './common/Modal';

import {
  removeNotification,
  type NotificationWithId,
} from '@desktop-client/notifications/notificationsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

// Notification stacking configuration
const MAX_VISIBLE_NOTIFICATIONS = 3; // Maximum number of notifications visible in the stack
const SCALE_MULTIPLIER = 0.05; // Scale reduction per stacked notification
const OPACITY_MULTIPLIER = 0.2; // Opacity reduction per stacked notification
const MIN_OPACITY = 1; // Minimum opacity for stacked notifications
const Y_OFFSET_PER_LEVEL = -20; // Vertical offset in pixels per stacked notification
const BASE_Z_INDEX = 10; // Base z-index for notification stacking

function compileMessage(
  message: string,
  actions: Record<string, () => void>,
  setLoading: (arg: SetStateAction<boolean>) => void,
  onRemove?: () => void,
) {
  return (
    <SpaceBetween direction="vertical" gap={10}>
      {message.split(/\n\n/).map((paragraph, idx) => {
        const parts = paragraph.split(/(\[[^\]]*\]\([^)]*\))/g);

        return (
          <Text key={idx} style={{ lineHeight: '1.4em' }}>
            {parts.map((part, idx) => {
              const match = part.match(/\[([^\]]*)\]\(([^)]*)\)/);
              if (match) {
                const [_, text, href] = match;

                if (href[0] === '#') {
                  const actionName = href.slice(1);
                  return (
                    <Link
                      variant="text"
                      key={idx}
                      onClick={async e => {
                        e.preventDefault();
                        if (actions[actionName]) {
                          setLoading(true);
                          await actions[actionName]();
                          onRemove();
                        }
                      }}
                    >
                      {text}
                    </Link>
                  );
                }

                return (
                  <Link
                    variant="external"
                    linkColor="purple"
                    key={idx}
                    to={match[2]}
                  >
                    {match[1]}
                  </Link>
                );
              }
              return <Text key={idx}>{part}</Text>;
            })}
          </Text>
        );
      })}
    </SpaceBetween>
  );
}

function Notification({
  notification,
  onRemove,
  index,
  isInteractive,
}: {
  notification: NotificationWithId;
  onRemove: () => void;
  index: number;
  isInteractive: boolean;
}) {
  const { t } = useTranslation();
  const {
    type,
    title,
    message,
    pre,
    messageActions,
    sticky,
    internal,
    button,
    timeout,
  } = notification;

  const [loading, setLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  const connected = useEffectEvent(() => {
    if (type === 'error' && internal) {
      console.error('Internal error:', internal);
    }

    if (!sticky) {
      setTimeout(onRemove, timeout || 6500);
    }
  });
  useEffect(() => connected(), []);

  const positive = type === 'message';
  const error = type === 'error';

  const processedMessage = useMemo(
    () => compileMessage(message, messageActions, setOverlayLoading, onRemove),
    [message, messageActions, onRemove, setOverlayLoading],
  );

  const { isNarrowWidth } = useResponsive();
  const narrowStyle: CSSProperties = isNarrowWidth
    ? { minHeight: styles.mobileMinHeight }
    : {};

  // Calculate stacking properties based on index (scales for any number of notifications)
  const scale = 1.0 - index * SCALE_MULTIPLIER;
  const stackOpacity = Math.max(MIN_OPACITY, 1.0 - index * OPACITY_MULTIPLIER);
  const zIndex = BASE_Z_INDEX - index;

  const yOffset = index * Y_OFFSET_PER_LEVEL;

  const [isSwiped, setIsSwiped] = useState(false);
  const [spring, api] = useSpring(() => ({
    x: 0,
    y: yOffset,
    opacity: stackOpacity,
    scale,
  }));

  // Update scale, opacity, and y-position when index changes
  useEffect(() => {
    api.start({ scale, opacity: stackOpacity, y: yOffset });
  }, [index, scale, stackOpacity, yOffset, api]);

  const swipeHandlers = useSwipeable({
    onSwiping: ({ deltaX }) => {
      if (!isSwiped) {
        api.start({ x: deltaX });
      }
    },
    onSwiped: ({ velocity, deltaX }) => {
      // Distance to trigger deletion
      const threshold = 100;
      const direction = deltaX > 0 ? 1 : -1;

      if (Math.abs(deltaX) > threshold || velocity > 0.5) {
        // Animate out & remove item after animation
        api.start({
          x: direction * 1000,
          opacity: 0,
          onRest: onRemove,
        });
        setIsSwiped(true);
      } else {
        // Reset position if not swiped far enough
        api.start({ x: 0 });
      }
    },
    trackMouse: true,
  });

  return (
    <animated.div
      role="alert"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex,
        // Combine translateX, translateY and scale transforms
        transform: to(
          [spring.x, spring.y, spring.scale],
          (x, y, s) => `translateX(${x}px) translateY(${y}px) scale(${s})`,
        ),
        opacity: spring.opacity,
        pointerEvents: isInteractive ? 'auto' : 'none',
        color: positive
          ? theme.noticeText
          : error
            ? theme.errorTextDark
            : theme.warningTextDark,
        // Prevents scrolling conflicts
        touchAction: isInteractive ? 'none' : 'auto',
      }}
      {...(isInteractive ? swipeHandlers : {})}
    >
      <View
        style={{
          position: 'relative',
          padding: '14px 14px',
          paddingRight: 40,
          borderRadius: 8,
          ...styles.mediumText,
          backgroundColor: positive
            ? theme.noticeBackgroundLight
            : error
              ? theme.errorBackground
              : theme.warningBackground,
          borderTop: `3px solid ${
            positive
              ? theme.noticeBorder
              : error
                ? theme.errorBorder
                : theme.warningBorder
          }`,
          ...styles.shadowLarge,
          maxWidth: 550,
          '& a': { color: 'currentColor' },
        }}
      >
        {/* Close button in top right corner */}
        <Button
          variant="bare"
          aria-label={t('Close')}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: 8,
            color: 'currentColor',
            opacity: 0.7,
          }}
          onPress={onRemove}
        >
          <SvgDelete style={{ width: 10, height: 10 }} />
        </Button>

        {/* Content and action button layout */}
        <SpaceBetween
          direction="vertical"
          gap={10}
          style={{ alignItems: 'flex-start' }}
        >
          {title && (
            <View
              style={{
                ...styles.mediumText,
                fontWeight: 700,
                paddingRight: 20,
              }}
            >
              {title}
            </View>
          )}

          {/* Message and button on same row */}
          <SpaceBetween
            wrap={false}
            gap={10}
            style={{ width: '100%', alignItems: 'flex-start' }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>{processedMessage}</View>
            {button && (
              <ButtonWithLoading
                variant="bare"
                isLoading={loading}
                onPress={async () => {
                  setLoading(true);
                  await button.action();
                  onRemove();
                  setLoading(false);
                }}
                className={css({
                  backgroundColor: 'transparent',
                  border: `1px solid ${
                    positive
                      ? theme.noticeBorder
                      : error
                        ? theme.errorBorder
                        : theme.warningBorder
                  }`,
                  color: 'currentColor',
                  ...styles.mediumText,
                  flexShrink: 0,
                  '&[data-hovered], &[data-pressed]': {
                    backgroundColor: positive
                      ? theme.noticeBackground
                      : error
                        ? theme.errorBackground
                        : theme.warningBackground,
                  },
                  ...narrowStyle,
                })}
              >
                {button.title}
              </ButtonWithLoading>
            )}
          </SpaceBetween>

          {pre
            ? pre.split('\n\n').map((text, idx) => (
                <View
                  key={idx}
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    backgroundColor: 'rgba(0, 0, 0, .05)',
                    padding: 10,
                    borderRadius: 4,
                    width: '100%',
                  }}
                >
                  {text}
                </View>
              ))
            : null}
        </SpaceBetween>
      </View>
      {overlayLoading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.tableBackground,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimatedLoading
            style={{ width: 20, height: 20, color: 'currentColor' }}
          />
        </View>
      )}
    </animated.div>
  );
}

export function Notifications({ style }: { style?: CSSProperties }) {
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const notifications = useSelector(state => state.notifications.notifications);
  const notificationInset = useSelector(state => state.notifications.inset);

  // Only show the last N notifications (newest first) for z-axis stacking
  // Reverse so newest notification (last in array) becomes index 0 (front)
  const visibleNotifications = notifications
    .slice(-MAX_VISIBLE_NOTIFICATIONS)
    .reverse();

  return (
    <View
      style={{
        position: 'fixed',
        bottom: notificationInset?.bottom || 20,
        top: notificationInset?.top,
        right: notificationInset?.right || 13,
        left: notificationInset?.left || (isNarrowWidth ? 13 : undefined),
        zIndex: MODAL_Z_INDEX - 1,
        width: isNarrowWidth ? undefined : 400,
        ...style,
      }}
    >
      <View style={{ position: 'relative' }}>
        {visibleNotifications.map((note, index) => (
          <Notification
            key={note.id}
            notification={note}
            index={index}
            isInteractive={index === 0}
            onRemove={() => {
              if (note.onClose) {
                note.onClose();
              }
              dispatch(removeNotification({ id: note.id }));
            }}
          />
        ))}
      </View>
    </View>
  );
}
