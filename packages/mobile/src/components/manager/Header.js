import React, { useState, useRef } from 'react';
import { connect } from 'react-redux';
import * as actions from 'loot-core/src/client/actions';
import Stack from 'loot-design/src/components/Stack';
import { Button } from 'loot-design/src/components/mobile/common';
import { colors, styles } from 'loot-design/src/style';

let buttonTextStyle = [
  styles.text,
  { fontWeight: 'bold', fontSize: 15, color: 'white' }
];

function Header({
  loadDemoBudget,
  navigation,
  buttons = ['back', 'demo', 'login']
}) {
  let buttonElements = buttons.map(name => {
    switch (name) {
      case 'back':
        return (
          <Button
            bare
            textStyle={buttonTextStyle}
            style={{ padding: 10 }}
            onPress={() => navigation.goBack()}
          >
            Back
          </Button>
        );
      case 'demo':
        return (
          <Button
            bare
            textStyle={buttonTextStyle}
            style={{ padding: 10, alignSelf: 'center' }}
            onPress={() => loadDemoBudget()}
          >
            Try demo
          </Button>
        );
      case 'login':
        return (
          <Button
            bare
            textStyle={buttonTextStyle}
            style={{ padding: 10 }}
            onPress={() => navigation.navigate('Login')}
          >
            Login
          </Button>
        );
      default:
        return null;
    }
  });

  return (
    <Stack direction="row" justify="space-between">
      {buttonElements}
    </Stack>
  );
}

export default connect(null, actions)(Header);
