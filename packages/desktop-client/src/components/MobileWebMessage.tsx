import React, { useState } from 'react';

import { useLocalPref } from '../hooks/useLocalPref';
import { useResponsive } from '../ResponsiveProvider';
import { theme, styles } from '../style';

import { Button } from './common/Button';
import { Text } from './common/Text';
import { View } from './common/View';
import { Checkbox } from './forms';

const buttonStyle = { border: 0, fontSize: 15, padding: '10px 13px' };

export function MobileWebMessage() {
  const [hideMobileMessage, setHideMobileMessagePref] = useLocalPref(
    'hideMobileMessage',
    true,
  );

  const { isNarrowWidth } = useResponsive();

  const [show, setShow] = useState(
    isNarrowWidth &&
      !hideMobileMessage &&
      !document.cookie.match(/hideMobileMessage=true/),
  );
  const [requestDontRemindMe, setRequestDontRemindMe] = useState(false);

  function onTry() {
    setShow(false);

    if (requestDontRemindMe) {
      // remember the pref indefinitely
      setHideMobileMessagePref(true);
    } else {
      // Set a cookie for 5 minutes
      const d = new Date();
      d.setTime(d.getTime() + 1000 * 60 * 5);
      document.cookie =
        'hideMobileMessage=true;path=/;expires=' + d.toUTCString();
    }
  }

  if (!show) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.mobileModalBackground,
        color: theme.mobileModalText,
        padding: 10,
        margin: 10,
        borderRadius: 6,
        zIndex: 10000,
        fontSize: 15,
        ...styles.shadowLarge,
      }}
    >
      <Text style={{ lineHeight: '1.5em' }}>
        <strong>Actual features are limited on small screens.</strong>
        <br />
        <span>
          While we work to improve this experience, you may find the full Actual
          feature set on devices with larger screens.
        </span>
      </Text>

      <View
        style={{
          gap: 16,
          marginTop: 20,
          justifyContent: 'center',
        }}
      >
        <Button style={buttonStyle} onClick={onTry}>
          Try it anyway
        </Button>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <Checkbox
            id="dont_remind_me"
            checked={requestDontRemindMe}
            onChange={() => {
              setRequestDontRemindMe(!requestDontRemindMe);
            }}
          />
          <label
            htmlFor="dont_remind_me"
            style={{
              userSelect: 'none',
            }}
          >
            Don’t remind me again
          </label>
        </View>
      </View>
    </View>
  );
}
