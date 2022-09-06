import React, { useState } from 'react';

import {
  View,
  Text,
  Button,
  ExternalLink
} from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

function isOSX() {
  var ua = window.navigator.userAgent;
  var iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  var webkit = !!ua.match(/WebKit/i);
  return iOS && webkit && !ua.match(/CriOS/i);
}

function isMobile() {
  // Simple detection: if the screen width it too small
  return window.innerWidth < 600;
}

let buttonStyle = { border: 0, fontSize: 15, padding: '10px 13px' };

export default function MobileWebMessage() {
  let appStoreURL = isOSX()
    ? 'https://itunes.apple.com/us/app/actual-budget-your-finances/id1444818585'
    : 'https://play.google.com/store/apps/details?id=com.shiftreset.actual';

  let [show, setShow] = useState(
    isMobile() && !document.cookie.match(/hideMobileMessage=true/)
  );

  function onTry() {
    setShow(false);

    // Set a cookie for 5 minutes
    let d = new Date();
    d.setTime(d.getTime() + 1000 * 60 * 5);
    document.cookie =
      'hideMobileMessage=true;path=/;expires=' + d.toGMTString();
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
        backgroundColor: colors.n1,
        color: 'white',
        padding: 10,
        margin: 10,
        borderRadius: 6,
        zIndex: 10000,
        fontSize: 15,
        boxShadow: styles.shadowLarge
      }}
    >
      <Text style={{ lineHeight: '1.5em' }}>
        <strong>It looks like you are using a mobile device.</strong> This app
        is built for desktop, but you can try it anyway. For the best mobile
        experience, download the app.
      </Text>

      <View
        style={{
          marginTop: 20,
          flexDirection: 'row',
          justifyContent: 'flex-end'
        }}
      >
        <Button style={buttonStyle} onClick={onTry}>
          Try it anyway
        </Button>
        <ExternalLink
          bare={false}
          href={appStoreURL}
          style={[buttonStyle, { marginLeft: 10 }]}
        >
          Download app
        </ExternalLink>
      </View>
    </View>
  );
}
