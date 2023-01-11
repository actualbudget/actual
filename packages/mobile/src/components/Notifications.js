import React, { useState, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';
import * as actions from 'loot-core/src/client/actions';
import { View, Text, Linking } from 'react-native';
import {
  Button,
  ButtonWithLoading
} from 'loot-design/src/components/mobile/common';
import Stack from 'loot-design/src/components/Stack';
import Delete from 'loot-design/src/svg/Delete';
import { styles, colors } from 'loot-design/src/style';

function compileMessage(message, actions, color, setLoading, onRemove) {
  return (
    <Stack spacing={2}>
      {message.split(/\n\n/).map(paragraph => {
        let parts = paragraph.split(/(\[[^\]]*\]\([^)]*\))/g);

        return (
          <Text style={{ lineHeight: 22, fontSize: 15, color }}>
            {parts.map(part => {
              let match = part.match(/\[([^\]]*)\]\(([^)]*)\)/);
              if (match) {
                let [_, text, href] = match;

                if (href[0] === '#') {
                  let actionName = href.slice(1);
                  return (
                    // eslint-disable-next-line
                    <Link
                      onOpen={async () => {
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
                  <Link onOpen={href => Linking.openURL(href)} href={match[2]}>
                    {match[1]}
                  </Link>
                );
              }
              return <Text>{part}</Text>;
            })}
          </Text>
        );
      })}
    </Stack>
  );
}

function Link({ href, children, onOpen }) {
  return (
    <Text
      style={{ textDecorationLine: 'underline' }}
      onPress={() => onOpen(href)}
    >
      {children}
    </Text>
  );
}

function Notification({ notification, onRemove }) {
  let {
    id,
    type,
    title,
    message,
    messageActions,
    sticky,
    internal,
    button
  } = notification;

  let [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sticky) {
      setTimeout(onRemove, 6500);
    }
  }, []);

  let positive = type === 'message';
  let error = type === 'error';
  let color = positive ? colors.g3 : error ? colors.r3 : colors.y2;

  let processedMessage = useMemo(
    () => compileMessage(message, messageActions, color, setLoading, onRemove),
    [message, messageActions, color]
  );

  return (
    <Stack
      align="center"
      direction="row"
      style={[
        {
          padding: 14,
          marginTop: 10,
          backgroundColor: positive
            ? colors.g11
            : error
            ? colors.r11
            : colors.y10,
          borderRadius: 6
        },
        ...styles.shadowLarge
      ]}
    >
      <Stack align="flex-start" style={{ flex: 1 }}>
        {title && (
          <Text
            style={{ fontWeight: '700', fontSize: 15, color, marginBottom: 10 }}
          >
            {title}
          </Text>
        )}
        <View>{processedMessage}</View>
        {button && (
          <ButtonWithLoading
            bare
            loading={loading}
            loadingColor={color}
            onPress={async () => {
              setLoading(true);
              await button.action();
              onRemove();
              setLoading(false);
            }}
            style={{
              backgroundColor: 'transparent',
              fontSize: 15,
              flexShrink: 0
            }}
            contentStyle={{
              padding: 7,
              borderWidth: 1,
              borderColor: positive ? colors.g5 : error ? colors.r4 : colors.y3
            }}
            textStyle={{ color }}
          >
            {button.title}
          </ButtonWithLoading>
        )}
      </Stack>
      {sticky && (
        <Button
          bare
          style={{
            padding: 10,
            backgroundColor: 'transparent'
          }}
          onPress={onRemove}
        >
          <Delete color={color} style={{ width: 9, height: 9 }} />
        </Button>
      )}
    </Stack>
  );
}

function Notifications({
  notifications,
  addNotification,
  removeNotification,
  style
}) {
  return (
    <View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          right: 0,
          left: 0,
          margin: 20,
          zIndex: 1000
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
  actions
)(Notifications);
