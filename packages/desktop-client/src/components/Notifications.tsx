import React, {
  useState,
  useEffect,
  useMemo,
  type SetStateAction,
} from 'react';
import { connect, useSelector } from 'react-redux';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import type { NotificationWithId } from 'loot-core/src/client/state-types/notifications';

import Loading from '../icons/AnimatedLoading';
import Delete from '../icons/v0/Delete';
import { styles, colors } from '../style';

import {
  View,
  Text,
  Button,
  ButtonWithLoading,
  Stack,
  ExternalLink,
  LinkButton,
} from './common';

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
          ? colors.noticeText
          : error
          ? colors.errorText
          : colors.warningText,
      }}
    >
      <Stack
        align="center"
        direction="row"
        style={{
          padding: '14px 14px',
          fontSize: 14,
          backgroundColor: positive
            ? colors.noticeBackground
            : error
            ? colors.errorBackground
            : colors.warningBackground,
          borderTop: `3px solid ${
            positive
              ? colors.noticeAccent
              : error
              ? colors.errorAccent
              : colors.warningAccent
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
              bare
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
                    ? colors.noticeAccent
                    : error
                    ? colors.errorAccent
                    : colors.warningAccent
                }`,
                color: 'currentColor',
                fontSize: 14,
                flexShrink: 0,
                '&:hover, &:active': {
                  backgroundColor: positive
                    ? colors.noticeBackground
                    : error
                    ? colors.errorBackground
                    : colors.warningBackground,
                },
              }}
            >
              {button.title}
            </ButtonWithLoading>
          )}
        </Stack>
        {sticky && (
          <Button
            bare
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
            backgroundColor: colors.tableBackground,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loading
            color="currentColor"
            style={{ width: 20, height: 20, color: 'currentColor' }}
          />
        </View>
      )}
    </View>
  );
}

function Notifications({ removeNotification, style }) {
  let notifications = useSelector(state => state.notifications.notifications);
  return (
    <View
      style={[
        {
          position: 'fixed',
          bottom: 20,
          right: 13,
          zIndex: 10000,
        },
        style,
      ]}
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

export default connect(null, dispatch => bindActionCreators(actions, dispatch))(
  Notifications,
);
