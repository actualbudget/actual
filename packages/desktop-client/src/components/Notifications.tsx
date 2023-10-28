import React, {
  useState,
  useEffect,
  useMemo,
  type SetStateAction,
} from 'react';
import { useSelector } from 'react-redux';

import type { NotificationWithId } from 'loot-core/src/client/state-types/notifications';

import { useActions } from '../hooks/useActions';
import AnimatedLoading from '../icons/AnimatedLoading';
import Delete from '../icons/v0/Delete';
import { styles, theme, type CSSProperties } from '../style';

import Button, { ButtonWithLoading } from './common/Button';
import ExternalLink from './common/ExternalLink';
import LinkButton from './common/LinkButton';
import Stack from './common/Stack';
import Text from './common/Text';
import View from './common/View';

function compileMessage(
  message: string,
  actions: Record<string, () => void>,
  setLoading: (arg: SetStateAction<boolean>) => void,
  onRemove?: () => void,
) {
  return (
    <Stack spacing={2}>
      {message.split(/\n\n/).map((paragraph, idx) => {
        let parts = paragraph.split(/(\[[^\]]*\]\([^)]*\))/g);

        return (
          <Text key={idx} style={{ lineHeight: '1.4em' }}>
            {parts.map((part, idx) => {
              let match = part.match(/\[([^\]]*)\]\(([^)]*)\)/);
              if (match) {
                let [_, text, href] = match;

                if (href[0] === '#') {
                  let actionName = href.slice(1);
                  return (
                    <LinkButton
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
                    </LinkButton>
                  );
                }

                return (
                  <ExternalLink key={idx} to={match[2]}>
                    {match[1]}
                  </ExternalLink>
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
  let { type, title, message, pre, messageActions, sticky, internal, button } =
    notification;

  let [loading, setLoading] = useState(false);
  let [overlayLoading, setOverlayLoading] = useState(false);

  useEffect(() => {
    if (type === 'error' && internal) {
      console.error('Internal error:', internal);
    }

    if (!sticky) {
      setTimeout(onRemove, 6500);
    }
  }, []);

  let positive = type === 'message';
  let error = type === 'error';

  let processedMessage = useMemo(
    () => compileMessage(message, messageActions, setOverlayLoading, onRemove),
    [message, messageActions],
  );

  return (
    <View
      style={{
        marginTop: 10,
        color: positive
          ? theme.noticeText
          : error
          ? theme.errorTextDark
          : theme.alt4WarningText,
      }}
    >
      <Stack
        align="center"
        direction="row"
        style={{
          padding: '14px 14px',
          fontSize: 14,
          backgroundColor: positive
            ? theme.noticeBackgroundLight
            : error
            ? theme.errorBackground
            : theme.alt2WarningBackground,
          borderTop: `3px solid ${
            positive
              ? theme.noticeBorder
              : error
              ? theme.errorBorder
              : theme.altWarningAccent
          }`,
          ...styles.shadowLarge,
          maxWidth: 550,
          '& a': { color: 'currentColor' },
        }}
      >
        <Stack align="flex-start">
          {title && (
            <View style={{ fontWeight: 700, marginBottom: 10 }}>{title}</View>
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
              type="bare"
              loading={loading}
              onClick={async () => {
                setLoading(true);
                await button.action();
                onRemove();
                setLoading(false);
              }}
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${
                  positive
                    ? theme.noticeBorder
                    : error
                    ? theme.errorBorder
                    : theme.altWarningAccent
                }`,
                color: 'currentColor',
                fontSize: 14,
                flexShrink: 0,
                '&:hover, &:active': {
                  backgroundColor: positive
                    ? theme.noticeBackground
                    : error
                    ? theme.errorBackground
                    : theme.altWarningBackground,
                },
              }}
            >
              {button.title}
            </ButtonWithLoading>
          )}
        </Stack>
        {sticky && (
          <Button
            type="bare"
            style={{ flexShrink: 0, color: 'currentColor' }}
            onClick={onRemove}
          >
            <Delete style={{ width: 9, height: 9, color: 'currentColor' }} />
          </Button>
        )}
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

export default function Notifications({ style }: { style?: CSSProperties }) {
  let { removeNotification } = useActions();
  let notifications = useSelector(state => state.notifications.notifications);
  return (
    <View
      style={{
        position: 'fixed',
        bottom: 20,
        right: 13,
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
            removeNotification(note.id);
          }}
        />
      ))}
    </View>
  );
}
