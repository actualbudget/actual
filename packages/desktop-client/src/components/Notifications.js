import React, { useState, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import {
  View,
  Text,
  Button,
  ButtonWithLoading,
  Stack,
  ExternalLink
} from 'loot-design/src/components/common';
import { styles, colors } from 'loot-design/src/style';
import Loading from 'loot-design/src/svg/AnimatedLoading';
import Delete from 'loot-design/src/svg/v0/Delete';

function compileMessage(message, actions, setLoading, onRemove) {
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
                    // eslint-disable-next-line
                    <a
                      href="#"
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
                    </a>
                  );
                }

                return (
                  <ExternalLink key={idx} asAnchor={true} href={match[2]}>
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

function Notification({ notification, onRemove }) {
  let { type, title, message, messageActions, sticky, internal, button } =
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
    [message, messageActions]
  );

  return (
    <View
      style={{
        marginTop: 10,
        color: positive ? colors.g3 : error ? colors.r3 : colors.y2
      }}
    >
      <Stack
        align="center"
        direction="row"
        style={{
          padding: '14px 14px',
          fontSize: 14,
          backgroundColor: positive
            ? colors.g11
            : error
            ? colors.r11
            : colors.y10,
          borderTop: `3px solid ${
            positive ? colors.g5 : error ? colors.r5 : colors.y4
          }`,
          ...styles.shadowLarge,
          maxWidth: 550,

          '& a': { color: 'currentColor' }
        }}
      >
        <Stack align="flex-start">
          {title && (
            <View style={{ fontWeight: 700, marginBottom: 10 }}>{title}</View>
          )}
          <View>{processedMessage}</View>
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
                  positive ? colors.g5 : error ? colors.r4 : colors.y3
                }`,
                color: 'currentColor',
                fontSize: 14,
                flexShrink: 0,
                '&:hover, &:active': {
                  backgroundColor: positive
                    ? colors.g9
                    : error
                    ? colors.r10
                    : colors.y9
                }
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
            backgroundColor: 'rgba(250, 250, 250, .75)',
            alignItems: 'center',
            justifyContent: 'center'
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

function Notifications({ notifications, removeNotification, style }) {
  return (
    <View
      style={[
        {
          position: 'absolute',
          bottom: 20,
          right: 13,
          zIndex: 10000
        },
        style
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

export default connect(
  state => ({ notifications: state.notifications.notifications }),
  dispatch => bindActionCreators(actions, dispatch)
)(Notifications);
