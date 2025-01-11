// @ts-strict-ignore
import React, {
  useState,
  useEffect,
  useMemo,
  type SetStateAction,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';

import { css } from '@emotion/css';

import {
  removeNotification,
  type NotificationWithId,
} from 'loot-core/client/notifications/notificationsSlice';

import { AnimatedLoading } from '../icons/AnimatedLoading';
import { SvgDelete } from '../icons/v0';
import { useSelector, useDispatch } from '../redux';
import { styles, theme } from '../style';

import { Button, ButtonWithLoading } from './common/Button2';
import { Link } from './common/Link';
import { Stack } from './common/Stack';
import { Text } from './common/Text';
import { View } from './common/View';
import { useResponsive } from './responsive/ResponsiveProvider';

function compileMessage(
  message: string,
  actions: Record<string, () => void>,
  setLoading: (arg: SetStateAction<boolean>) => void,
  onRemove?: () => void,
) {
  return (
    <Stack spacing={2}>
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
    </Stack>
  );
}

function Notification({
  notification,
  onRemove,
}: {
  notification: NotificationWithId;
  onRemove: () => void;
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

  useEffect(() => {
    if (type === 'error' && internal) {
      console.error('Internal error:', internal);
    }

    if (!sticky) {
      setTimeout(onRemove, timeout || 6500);
    }
  }, []);

  const positive = type === 'message';
  const error = type === 'error';

  const processedMessage = useMemo(
    () => compileMessage(message, messageActions, setOverlayLoading, onRemove),
    [message, messageActions],
  );

  const { isNarrowWidth } = useResponsive();
  const narrowStyle: CSSProperties = isNarrowWidth
    ? { minHeight: styles.mobileMinHeight }
    : {};

  return (
    <View
      style={{
        marginTop: 10,
        color: positive
          ? theme.noticeText
          : error
            ? theme.errorTextDark
            : theme.warningTextDark,
      }}
    >
      <Stack
        align="center"
        justify="space-between"
        direction="row"
        style={{
          padding: '14px 14px',
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
        <Stack align="flex-start">
          {title && (
            <View
              style={{
                ...styles.mediumText,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              {title}
            </View>
          )}
          <View>{processedMessage}</View>
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
                  }}
                >
                  {text}
                </View>
              ))
            : null}
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
        </Stack>
        <Button
          variant="bare"
          aria-label={t('Close')}
          style={{ flexShrink: 0, color: 'currentColor' }}
          onPress={onRemove}
        >
          <SvgDelete style={{ width: 9, height: 9, color: 'currentColor' }} />
        </Button>
      </Stack>
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
    </View>
  );
}

export function Notifications({ style }: { style?: CSSProperties }) {
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const notifications = useSelector(state => state.notifications.notifications);
  const notificationInset = useSelector(state => state.notifications.inset);
  return (
    <View
      style={{
        position: 'fixed',
        bottom: notificationInset?.bottom || 20,
        top: notificationInset?.top,
        right: notificationInset?.right || 13,
        left: notificationInset?.left || (isNarrowWidth ? 13 : undefined),
        zIndex: 10000,
        ...style,
      }}
    >
      {notifications.map(note => (
        <Notification
          key={note.id}
          notification={note}
          onRemove={() => {
            if (note.onClose) {
              note.onClose();
            }
            dispatch(removeNotification({ id: note.id }));
          }}
        />
      ))}
    </View>
  );
}
